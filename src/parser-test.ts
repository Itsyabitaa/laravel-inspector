import { Engine } from 'php-parser';

const code = `
<?php
class Test {
    function getUsersWithPosts_N_Plus_One() {
        foreach ($users as $user) {
            $posts = $user->posts; // This is the magic property access
        }
    }
}
`;

const parser = new Engine({
    parser: { php7: true },
    ast: { withPositions: true }
});

const ast = parser.parseCode(code, 'test.php');
console.log(JSON.stringify(ast, null, 2));
