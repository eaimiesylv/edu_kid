<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SkillMastery extends Model
{
    protected $table = 'concept_skill_mastery';

    protected $fillable = ['child_id', 'concept_id', 'skill', 'record'];

    protected function casts(): array
    {
        return ['record' => 'array'];
    }
}
