<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->createIdentity();
        $this->createCurriculum();
        $this->createLearning();
        $this->createEvidence();
    }

    private function createIdentity(): void
    {
        Schema::create('device_tokens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamps();
        });
        Schema::create('children', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 80);
            $table->unsignedTinyInteger('age');
            $table->timestamps();
        });
    }

    private function createCurriculum(): void
    {
        Schema::create('subjects', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('name');
        });
        Schema::create('curriculum_levels', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('subject_id');
            $table->foreign('subject_id')->references('id')->on('subjects');
            $table->string('name');
        });
        Schema::create('concepts', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('level_id');
            $table->foreign('level_id')->references('id')->on('curriculum_levels');
            $table->string('type');
            $table->string('value');
            $table->json('capabilities');
            $table->json('content');
        });
        Schema::create('skills', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->string('name');
        });
    }

    private function createLearning(): void
    {
        Schema::create('learning_configs', function (Blueprint $table): void {
            $table->id();
            $table->foreignUuid('child_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('subject');
            $table->json('concept_ids');
            $table->string('current_concept_id');
            $table->timestamps();
        });
        Schema::create('learning_sessions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('child_id')->constrained()->cascadeOnDelete();
            $table->timestamp('started_at');
            $table->timestamp('finished_at')->nullable();
            $table->unsignedInteger('reward_stars')->default(0);
            $table->timestamps();
        });
        Schema::create('revision_schedule', function (Blueprint $table): void {
            $table->id();
            $table->foreignUuid('child_id')->constrained()->cascadeOnDelete();
            $table->string('concept_id');
            $table->timestamp('due_at');
            $table->unique(['child_id', 'concept_id']);
        });
    }

    private function createEvidence(): void
    {
        Schema::create('attempts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('child_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('session_id')->constrained('learning_sessions')->cascadeOnDelete();
            $table->string('concept_id');
            $table->string('skill');
            $table->json('evidence');
            $table->timestamp('occurred_at');
            $table->timestamps();
            $table->index(['child_id', 'concept_id', 'skill', 'occurred_at']);
        });
        Schema::create('concept_skill_mastery', function (Blueprint $table): void {
            $table->id();
            $table->foreignUuid('child_id')->constrained()->cascadeOnDelete();
            $table->string('concept_id');
            $table->string('skill');
            $table->json('record');
            $table->timestamps();
            $table->unique(['child_id', 'concept_id', 'skill']);
        });
    }

    public function down(): void
    {
        foreach (['concept_skill_mastery', 'attempts', 'revision_schedule', 'learning_sessions', 'learning_configs',
            'skills', 'concepts', 'curriculum_levels', 'subjects', 'children', 'device_tokens'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
