import { Engine } from 'php-parser';


const code = `
<?php
helloWorld();
`;

const parser = new Engine({
    parser: { php7: true },
    ast: { withPositions: true }
});

const ast = parser.parseCode(code, 'test.php');
console.log(JSON.stringify(ast, null, 2));
