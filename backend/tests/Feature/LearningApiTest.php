<?php

namespace Tests\Feature;

use App\Models\Child;
use App\Models\SkillMastery;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class LearningApiTest extends TestCase
{
    use RefreshDatabase;

    private function signIn(User $user): void
    {
        $token = Str::random(64);
        DB::table('device_tokens')->insert(['user_id' => $user->id, 'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addDay(), 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.$token);
    }

    private function evidence(Child $child, array $changes = []): array
    {
        return [...[
            'id' => (string) Str::uuid(), 'childId' => $child->id, 'sessionId' => (string) Str::uuid(),
            'activityId' => (string) Str::uuid(), 'conceptId' => 'letter-a', 'skill' => 'recognition',
            'activity' => 'recognise', 'gameType' => 'cards', 'correct' => true, 'firstAttempt' => true,
            'hintsUsed' => 0, 'assistanceLevel' => 0, 'responseTimeMs' => 1800, 'difficulty' => 2,
            'interactionFailure' => false, 'occurredAt' => now()->subMinute()->toIso8601String(),
        ], ...$changes];
    }

    public function test_authentication_and_logout_revoke_access(): void
    {
        $response = $this->postJson('/api/auth/register', ['name' => 'Parent', 'email' => 'PARENT@example.com', 'password' => 'long-password-123']);
        $response->assertCreated()->assertJsonStructure(['token', 'user']);
        $this->assertDatabaseHas('users', ['email' => 'parent@example.com']);
        $this->withHeader('Authorization', 'Bearer '.$response->json('token'));
        $this->getJson('/api/children')->assertOk();
        $this->postJson('/api/auth/logout')->assertOk();
        $this->getJson('/api/children')->assertUnauthorized();
        $this->postJson('/api/auth/login', ['email' => 'parent@example.com', 'password' => 'bad'])->assertUnprocessable();
    }

    public function test_attempt_retry_does_not_double_count_mastery_or_rewards(): void
    {
        $child = Child::factory()->create();
        $this->signIn($child->parent);
        $attempt = $this->evidence($child);
        $payload = ['child_id' => $child->id, 'attempts' => [$attempt]];
        $this->postJson('/api/sync', $payload)->assertOk()->assertJsonPath('accepted.0', $attempt['id']);
        $this->postJson('/api/sync', $payload)->assertOk();
        $this->assertDatabaseCount('attempts', 1);
        $this->assertSame(1, SkillMastery::first()->record['samples']);
        $this->assertDatabaseHas('learning_sessions', ['id' => $attempt['sessionId'], 'reward_stars' => 1]);
    }

    public function test_other_parents_cannot_read_change_or_sync_child_records(): void
    {
        $child = Child::factory()->create();
        $this->signIn(User::factory()->create());
        $this->getJson('/api/children/'.$child->id.'/report')->assertNotFound();
        $this->putJson('/api/children/'.$child->id.'/config', [])->assertNotFound();
        $this->postJson('/api/sync', ['child_id' => $child->id, 'attempts' => [$this->evidence($child)]])->assertNotFound();
        $this->assertDatabaseCount('attempts', 0);
    }

    public function test_interaction_failure_does_not_reduce_knowledge(): void
    {
        $child = Child::factory()->create();
        $this->signIn($child->parent);
        $attempt = $this->evidence($child, ['correct' => false, 'interactionFailure' => true]);
        $this->postJson('/api/sync', ['child_id' => $child->id, 'attempts' => [$attempt]])->assertOk();
        $this->assertSame(0, SkillMastery::first()->record['samples']);
        $this->assertSame(0, SkillMastery::first()->record['failures']);
    }

    public function test_out_of_order_sync_rebuilds_from_chronological_evidence(): void
    {
        $child = Child::factory()->create();
        $this->signIn($child->parent);
        $later = $this->evidence($child, ['occurredAt' => now()->subMinute()->toIso8601String()]);
        $earlier = $this->evidence($child, ['correct' => false, 'occurredAt' => now()->subDays(2)->toIso8601String()]);
        $this->postJson('/api/sync', ['child_id' => $child->id, 'attempts' => [$later]])->assertOk();
        $this->postJson('/api/sync', ['child_id' => $child->id, 'attempts' => [$earlier]])->assertOk();
        $this->assertEqualsWithDelta(.35, SkillMastery::first()->record['score'], .000001);
        $this->assertSame(2, SkillMastery::first()->record['samples']);
    }

    public function test_configuration_override_preserves_mastery_and_validates_boundary(): void
    {
        $child = Child::factory()->create();
        $this->signIn($child->parent);
        $this->postJson('/api/sync', ['child_id' => $child->id, 'attempts' => [$this->evidence($child)]])->assertOk();
        $path = '/api/children/'.$child->id.'/config';
        $this->putJson($path, ['subject' => 'english', 'conceptIds' => ['letter-a', 'letter-b'], 'currentConceptId' => 'letter-b'])->assertOk();
        $this->assertDatabaseCount('concept_skill_mastery', 1);
        $this->putJson($path, ['subject' => 'english', 'conceptIds' => ['letter-a'], 'currentConceptId' => 'letter-c'])->assertUnprocessable();
    }

    public function test_invalid_batch_rolls_back_and_child_plan_is_enforced(): void
    {
        $child = Child::factory()->create();
        $this->signIn($child->parent);
        $this->postJson('/api/children', ['name' => 'Second', 'age' => 4])->assertUnprocessable();
        $this->postJson('/api/sync', ['child_id' => $child->id, 'attempts' => [
            $this->evidence($child), $this->evidence($child, ['assistanceLevel' => 99]),
        ]])->assertUnprocessable();
        $this->assertDatabaseCount('attempts', 0);
    }

    public function test_a_foreign_session_identifier_cannot_capture_another_childs_attempts(): void
    {
        $other = Child::factory()->create();
        $this->signIn($other->parent);
        $original = $this->evidence($other);
        $this->postJson('/api/sync', ['child_id' => $other->id, 'attempts' => [$original]])->assertOk();
        $child = Child::factory()->create();
        $this->signIn($child->parent);
        $attempt = $this->evidence($child, ['sessionId' => $original['sessionId']]);
        $this->postJson('/api/sync', ['child_id' => $child->id, 'attempts' => [$attempt]])->assertConflict();
        $this->assertDatabaseCount('attempts', 1);
    }
}
