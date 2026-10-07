<?php

require __DIR__.'/../backend/vendor/autoload.php';

use PhpParser\Node;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitorAbstract;
use PhpParser\ParserFactory;

$visitor = new class extends NodeVisitorAbstract
{
    public string $path = '';

    public int $count = 0;

    public bool $failed = false;

    public function enterNode(Node $node): null
    {
        if ($node instanceof Node\FunctionLike) {
            $this->count++;
            $lines = $node->getEndLine() - $node->getStartLine() + 1;
            if ($lines > 50) {
                $this->failed = true;
                echo $this->path.':'.$node->getStartLine().' '.$lines.' lines'.PHP_EOL;
            }
        }

        return null;
    }
};
$parser = (new ParserFactory)->createForNewestSupportedVersion();
$traverser = new NodeTraverser($visitor);
foreach (['app', 'routes', 'database', 'tests', 'bootstrap', 'config'] as $directory) {
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(__DIR__.'/../backend/'.$directory));
    foreach ($files as $file) {
        if ($file->getExtension() === 'php' && ! str_contains($file->getPathname(), DIRECTORY_SEPARATOR.'cache'.DIRECTORY_SEPARATOR)) {
            $visitor->path = $file->getPathname();
            $traverser->traverse($parser->parse(file_get_contents($visitor->path)));
        }
    }
}
echo 'Checked '.$visitor->count.' PHP functions (limit: 50 lines).'.PHP_EOL;
exit($visitor->failed ? 1 : 0);
