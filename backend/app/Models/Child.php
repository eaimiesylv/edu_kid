<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Child extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['user_id', 'name', 'age'];

    protected $hidden = ['user_id', 'created_at', 'updated_at'];

    protected function casts(): array
    {
        return ['age' => 'integer'];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
