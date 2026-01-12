import { Engine } from 'php-parser';

const parser = new Engine({
    parser: { php7: true },
    ast: { withPositions: true }
});

export function parsePhp(code: string) {
    return parser.parseCode(code, 'src.php');
}
