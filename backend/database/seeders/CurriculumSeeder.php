<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CurriculumSeeder extends Seeder
{
    public function run(): void
    {
        $data = json_decode(file_get_contents(database_path('data/curriculum.json')), true, flags: JSON_THROW_ON_ERROR);
        DB::table('subjects')->updateOrInsert(['id' => 'english'], ['name' => 'English']);
        DB::table('curriculum_levels')->updateOrInsert(['id' => 'letters'], ['subject_id' => 'english', 'name' => 'Letters']);
        foreach ($data['skills'] as $skill) {
            DB::table('skills')->updateOrInsert(['id' => $skill], ['name' => ucwords(str_replace('_', ' ', $skill))]);
        }
        foreach ($data['curriculum'] as $concept) {
            DB::table('concepts')->updateOrInsert(['id' => $concept['id']], [
                'level_id' => $concept['level'], 'type' => $concept['type'], 'value' => $concept['value'],
                'capabilities' => json_encode($concept['capabilities'], JSON_THROW_ON_ERROR),
                'content' => json_encode($concept, JSON_THROW_ON_ERROR),
            ]);
        }
    }
}
