# Laravel Inspector 🔍

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/kuku-sha.laravel-inspector.svg?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=kuku-sha.laravel-inspector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Laravel Inspector** is a powerful VS Code extension designed to provide instant static analysis for Laravel controllers. It helps developers identify performance bottlenecks, N+1 query issues, and complex logic before the code even leaves the editor.

---

## 🚀 Key Features

### 🔍 Real-time Analysis
*   **Complexity Estimation**: Instant Big O complexity estimates displayed via CodeLens above each controller method.
*   **Query Counting**: Automatically detects and counts database queries within your methods.
*   **N+1 Detection**: Proactive alerts for potential N+1 query problems within loops.

### 🎨 Visual Feedback
*   **Semantic Highlighting**: Query lines are color-coded based on their performance profile:
    *   🔵 **Blue**: Standard queries (`User::all()`, `->get()`).
    *   🟡 **Yellow**: Queries inside loops (High N+1 risk).
    *   🔴 **Red**: Heavy operations (e.g., `paginate()` which executes two SQL queries).
    *   🟢 **Green**: Optimized operations (e.g., `simplePaginate()`).

### ⚠️ Proactive Diagnostics
*   **Problems Panel Integration**: Warnings and suggestions appear directly in the VS Code Problems panel.
*   **Intelligent Hovers**: Detailed tooltips explaining *why* a line is flagged and how to optimize it.
*   **Relationship Awareness**: Detects both explicit Eloquent calls and lazy-loaded relationship access.

---

## 🛠 How It Works

Laravel Inspector uses advanced **static analysis** of your PHP code. Unlike runtime profilers, it doesn't require a running application or database connection.

*   **AST Parsing**: Analyzes code structure using an Abstract Syntax Tree (AST).
*   **Heuristic Detection**: Identifies Eloquent patterns, `DB` facade calls, and relationship accessors.
*   **Scope Analysis**: Tracks variable usage across loops and conditional blocks to estimate query impact.

---

## 📦 Installation

### Via VS Code Marketplace (Recommended)
1. Open **VS Code**.
2. Go to **Extensions** (`Ctrl+Shift+X`).
3. Search for `Laravel Inspector`.
4. Click **Install**.

### Manual Installation (.VSIX)
1. Download the latest `.vsix` release.
2. Run the following command:
   ```bash
   code --install-extension laravel-inspector-X.X.X.vsix
   ```

### Building from Source
```bash
git clone https://github.com/kuku-sha/laravel-inspector.git
cd laravel-inspector
npm install
npm run compile
```

---

## 📖 How to Use

### 1. Automatic Analysis
The extension activates automatically when you open any PHP file located in `app/Http/Controllers/`. Analysis happens in the background as you type.

### 2. Manual Trigger
If you want a full report of all methods in a controller:
1. Open a controller file.
2. Open the **Command Palette** (`Ctrl+Shift+P`).
3. Type `Laravel Inspector: Analyze Controller`.
4. Results will appear in the **Output** channel and a summary notification.

---

## ⚙️ Configuration

You can customize Laravel Inspector via `File > Preferences > Settings` (search for "Laravel Inspector"):

| Setting | Default | Description |
| :--- | :--- | :--- |
| `laravelInspector.enableCodeLens` | `true` | Show complexity and query info above methods. |
| `laravelInspector.enableDiagnostics` | `true` | Show N+1 warnings in the Problems panel. |
| `laravelInspector.enableDecorations` | `true` | Highlight query lines with colors. |

---

## 💡 Examples & Best Practices

### Detecting N+1 Queries

**❌ Sub-optimal Pattern**
```php
public function index() {
    $users = User::all(); // 🔵 Standard Query
    
    foreach ($users as $user) {
        $posts = $user->posts; // ⚠️ Yellow Highlight: Lazy loading in loop
    }
}
```

**✅ Optimized Pattern**
```php
public function index() {
    $users = User::with('posts')->get(); // 🔵 Eager Loading
    
    foreach ($users as $user) {
        $posts = $user->posts; // ✨ No extra query triggered
    }
}
```

---

## ⚠️ Limitations & Security

**Accuracy**: This is a static analysis tool. It uses heuristics and cannot account for dynamic runtime behavior (e.g., queries generated via variable method names or complex service injections).

**Scope**: Currently optimized for `app/Http/Controllers/`. Support for Models, Services, and Jobs is planned for future releases.

**Security**: No code is ever executed or sent to a third-party server. All analysis happens locally on your machine.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🙏 Acknowledgments

*   [php-parser](https://github.com/glayzzle/php-parser) by glayzzle.
*   The Laravel community for inspiring better performance tools.
