<?php

return [
    'paths' => ['api/*'], 'allowed_methods' => ['*'],
    'allowed_origins' => explode(',', env('FRONTEND_ORIGINS', 'http://127.0.0.1:3000,http://localhost:3000')),
    'allowed_origins_patterns' => [], 'allowed_headers' => ['Accept', 'Authorization', 'Content-Type'],
    'exposed_headers' => [], 'max_age' => 600, 'supports_credentials' => false,
];
