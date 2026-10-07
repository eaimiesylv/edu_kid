<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LearningConfig extends Model
{
    protected $fillable = ['child_id', 'subject', 'concept_ids', 'current_concept_id'];

    protected function casts(): array
    {
        return ['concept_ids' => 'array'];
    }
}
