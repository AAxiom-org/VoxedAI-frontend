// Code examples for the Sandbox component
// Contains sample files for different programming languages

const languageFiles = {
  javascript: {
    "/App.js": {
      code: `// JavaScript example
import React from "react";
import "./styles.css";

export default function App() {
  // Fibonacci function in JavaScript
  const fibonacci = (n) => {
    if (n <= 1) return n;
    
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      const temp = a + b;
      a = b;
      b = temp;
    }
    return b;
  };

  // Calculate and display first 10 Fibonacci numbers
  const fibNumbers = Array.from({ length: 10 }, (_, i) => fibonacci(i));

  return (
    <div className="App">
      <h1>JavaScript Example</h1>
      <p>Fibonacci Sequence:</p>
      <ul>
        {fibNumbers.map((num, index) => (
          <li key={index}>
            Fibonacci({index}) = {num}
          </li>
        ))}
      </ul>
    </div>
  );
}`,
      active: true,
    },
    "/styles.css": {
      code: `.App {
  font-family: sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #333;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  background-color: #f5f5f5;
  margin: 5px 0;
  padding: 10px;
  border-radius: 4px;
}`,
      active: false,
    },
  },
  python: {
    "/main.py": {
      code: `# Python example
def fibonacci(n):
    """Calculate the nth Fibonacci number iteratively."""
    if n <= 1:
        return n
        
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
        
    return b

# Calculate and display first 10 Fibonacci numbers
if __name__ == "__main__":
    print("Python Example")
    print("Fibonacci Sequence:")
    for i in range(10):
        print(f"Fibonacci({i}) = {fibonacci(i)}")
`,
      active: true,
    },
  },
  java: {
    "/Fibonacci.java": {
      code: `// Java example
public class Fibonacci {
    public static void main(String[] args) {
        System.out.println("Java Example");
        System.out.println("Fibonacci Sequence:");
        
        // Calculate and display first 10 Fibonacci numbers
        for (int i = 0; i < 10; i++) {
            System.out.println("Fibonacci(" + i + ") = " + fibonacci(i));
        }
    }
    
    // Fibonacci function in Java
    public static long fibonacci(int n) {
        if (n <= 1) {
            return n;
        }
        
        long a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            long temp = a + b;
            a = b;
            b = temp;
        }
        return b;
    }
}`,
      active: true,
    },
  },
  cpp: {
    "/fibonacci.cpp": {
      code: `// C++ example
#include <iostream>
#include <vector>

// Fibonacci function in C++
long long fibonacci(int n) {
    if (n <= 1) {
        return n;
    }
    
    long long a = 0, b = 1;
    for (int i = 2; i <= n; i++) {
        long long temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}

int main() {
    std::cout << "C++ Example" << std::endl;
    std::cout << "Fibonacci Sequence:" << std::endl;
    
    // Calculate and display first 10 Fibonacci numbers
    for (int i = 0; i < 10; i++) {
        std::cout << "Fibonacci(" << i << ") = " << fibonacci(i) << std::endl;
    }
    
    return 0;
}`,
      active: true,
    },
    "/fibonacci.h": {
      code: `// Header file for Fibonacci function
#ifndef FIBONACCI_H
#define FIBONACCI_H

long long fibonacci(int n);

#endif // FIBONACCI_H`,
      active: false,
    },
  },
  rust: {
    "/main.rs": {
      code: `// Rust example
fn main() {
    println!("Rust Example");
    println!("Fibonacci Sequence:");
    
    // Calculate and display first 10 Fibonacci numbers
    for i in 0..10 {
        println!("Fibonacci({}) = {}", i, fibonacci(i));
    }
    
    // Create a vector with the first 10 Fibonacci numbers
    let mut fib_sequence = Vec::new();
    for i in 0..10 {
        fib_sequence.push(fibonacci(i));
    }
    
    println!("\nFibonacci sequence: {:?}", fib_sequence);
}

// Fibonacci function in Rust
fn fibonacci(n: u64) -> u64 {
    if n <= 1 {
        return n;
    }
    
    let (mut a, mut b) = (0, 1);
    for _ in 2..=n {
        let temp = a + b;
        a = b;
        b = temp;
    }
    b
}`,
      active: true,
    },
  },
  php: {
    "/index.php": {
      code: `<?php
// PHP example
/**
 * Calculate the nth Fibonacci number iteratively
 * 
 * @param int $n The position in the Fibonacci sequence
 * @return int The nth Fibonacci number
 */
function fibonacci($n) {
    if ($n <= 1) {
        return $n;
    }
    
    $a = 0;
    $b = 1;
    for ($i = 2; $i <= $n; $i++) {
        $temp = $a + $b;
        $a = $b;
        $b = $temp;
    }
    return $b;
}

// Calculate and display first 10 Fibonacci numbers
echo "<h1>PHP Example</h1>";
echo "<p>Fibonacci Sequence:</p>";
echo "<ul>";
for ($i = 0; $i < 10; $i++) {
    echo "<li>Fibonacci({$i}) = " . fibonacci($i) . "</li>";
}
echo "</ul>";
?>`,
      active: true,
    },
  },
  sql: {
    "/fibonacci.sql": {
      code: `-- SQL example (PostgreSQL)
-- Create a table to store Fibonacci numbers
CREATE TABLE IF NOT EXISTS fibonacci_numbers (
    position INTEGER PRIMARY KEY,
    value BIGINT NOT NULL
);

-- Clear any existing data
DELETE FROM fibonacci_numbers;

-- Insert the first two Fibonacci numbers
INSERT INTO fibonacci_numbers (position, value) 
VALUES (0, 0), (1, 1);

-- Generate Fibonacci sequence using recursive CTE
WITH RECURSIVE fibonacci_sequence AS (
    -- Base case: first two numbers
    SELECT 
        position, 
        value, 
        position + 1 AS next_position
    FROM 
        fibonacci_numbers
    WHERE 
        position <= 1
    
    UNION ALL
    
    -- Recursive step: calculate next number
    SELECT 
        fs.next_position AS position,
        f1.value + f2.value AS value,
        fs.next_position + 1 AS next_position
    FROM 
        fibonacci_sequence fs
    JOIN 
        fibonacci_numbers f1 ON f1.position = fs.position - 1
    JOIN 
        fibonacci_numbers f2 ON f2.position = fs.position - 2
    WHERE 
        fs.next_position < 10
)
-- Insert the calculated values
INSERT INTO fibonacci_numbers (position, value)
SELECT position, value
FROM fibonacci_sequence
WHERE position > 1;

-- Display results
SELECT * FROM fibonacci_numbers ORDER BY position;`,
      active: true,
    },
  },
  html: {
    "/index.html": {
      code: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fibonacci Sequence - HTML Example</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>HTML Example</h1>
            <p>Displaying the Fibonacci Sequence</p>
        </header>
        
        <main>
            <section class="fibonacci-display">
                <h2>Fibonacci Sequence</h2>
                <p>The Fibonacci sequence is a series of numbers where each number is the sum of the two preceding ones, starting from 0 and 1.</p>
                
                <div class="visualization">
                    <div class="fib-number" style="width: 0px; height: 0px;"></div>
                    <div class="fib-number" style="width: 1px; height: 1px;"></div>
                    <div class="fib-number" style="width: 1px; height: 1px;"></div>
                    <div class="fib-number" style="width: 2px; height: 2px;"></div>
                    <div class="fib-number" style="width: 3px; height: 3px;"></div>
                    <div class="fib-number" style="width: 5px; height: 5px;"></div>
                    <div class="fib-number" style="width: 8px; height: 8px;"></div>
                    <div class="fib-number" style="width: 13px; height: 13px;"></div>
                    <div class="fib-number" style="width: 21px; height: 21px;"></div>
                    <div class="fib-number" style="width: 34px; height: 34px;"></div>
                </div>
                
                <ul class="fibonacci-list">
                    <li><span class="position">F(0)</span> = <span class="value">0</span></li>
                    <li><span class="position">F(1)</span> = <span class="value">1</span></li>
                    <li><span class="position">F(2)</span> = <span class="value">1</span></li>
                    <li><span class="position">F(3)</span> = <span class="value">2</span></li>
                    <li><span class="position">F(4)</span> = <span class="value">3</span></li>
                    <li><span class="position">F(5)</span> = <span class="value">5</span></li>
                    <li><span class="position">F(6)</span> = <span class="value">8</span></li>
                    <li><span class="position">F(7)</span> = <span class="value">13</span></li>
                    <li><span class="position">F(8)</span> = <span class="value">21</span></li>
                    <li><span class="position">F(9)</span> = <span class="value">34</span></li>
                </ul>
            </section>
            
            <section class="formula">
                <h2>The Formula</h2>
                <div class="math-formula">
                    <p>F(n) = F(n-1) + F(n-2)</p>
                    <p>Where F(0) = 0 and F(1) = 1</p>
                </div>
            </section>
        </main>
        
        <footer>
            <p>This is a simple HTML example showing the Fibonacci sequence.</p>
        </footer>
    </div>
    
    <script src="script.js"></script>
</body>
</html>`,
      active: true,
    },
    "/styles.css": {
      code: `/* CSS for HTML example */
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
    background-color: #f5f5f5;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background-color: white;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
}

header {
    text-align: center;
    padding-bottom: 20px;
    border-bottom: 1px solid #eee;
}

h1, h2 {
    color: #0066cc;
}

.fibonacci-display {
    margin: 30px 0;
}

.visualization {
    display: flex;
    align-items: flex-end;
    height: 50px;
    margin: 30px 0;
    gap: 5px;
}

.fib-number {
    background-color: #0066cc;
    border-radius: 50%;
}

.fibonacci-list {
    list-style: none;
    padding: 0;
}

.fibonacci-list li {
    padding: 10px;
    border-bottom: 1px solid #eee;
}

.fibonacci-list li:nth-child(even) {
    background-color: #f9f9f9;
}

.position {
    font-weight: bold;
    color: #0066cc;
}

.value {
    font-weight: bold;
}

.formula {
    background-color: #f9f9f9;
    padding: 20px;
    border-radius: 5px;
    text-align: center;
}

.math-formula {
    font-family: 'Courier New', Courier, monospace;
    font-size: 1.2em;
}

footer {
    margin-top: 30px;
    text-align: center;
    font-size: 0.9em;
    color: #777;
}`,
      active: false,
    },
    "/script.js": {
      code: `// JavaScript for HTML example
document.addEventListener('DOMContentLoaded', function() {
    console.log('Fibonacci sequence visualization loaded');
    
    // You could add animations or interactive elements here
    const fibNumbers = document.querySelectorAll('.fib-number');
    
    fibNumbers.forEach((element, index) => {
        setTimeout(() => {
            element.style.transition = 'transform 0.5s ease-out';
            element.style.transform = 'scale(1.2)';
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 300);
        }, index * 200);
    });
});`,
      active: false,
    },
  },
  css: {
    "/index.html": {
      code: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSS Fibonacci Example</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>CSS Example</h1>
        <h2>Fibonacci Spiral Visualization</h2>
        
        <div class="fibonacci-spiral">
            <div class="box box-1"></div>
            <div class="box box-2"></div>
            <div class="box box-3"></div>
            <div class="box box-4"></div>
            <div class="box box-5"></div>
            <div class="box box-6"></div>
            <div class="box box-7"></div>
            <div class="spiral"></div>
        </div>
        
        <div class="sequence-display">
            <h3>First 10 Fibonacci Numbers:</h3>
            <div class="number-row">
                <div class="number">0</div>
                <div class="number">1</div>
                <div class="number">1</div>
                <div class="number">2</div>
                <div class="number">3</div>
                <div class="number">5</div>
                <div class="number">8</div>
                <div class="number">13</div>
                <div class="number">21</div>
                <div class="number">34</div>
            </div>
        </div>
    </div>
</body>
</html>`,
      active: false,
    },
    "/styles.css": {
      code: `/* CSS example - Fibonacci visualization with CSS */

/* Basic styling and reset */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Arial', sans-serif;
    background-color: #f0f0f0;
    color: #333;
    line-height: 1.6;
}

.container {
    max-width: 800px;
    margin: 30px auto;
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

h1, h2, h3 {
    text-align: center;
    color: #2c3e50;
}

h1 {
    margin-bottom: 10px;
}

h2 {
    margin-bottom: 30px;
    font-weight: normal;
    color: #7f8c8d;
}

h3 {
    margin-bottom: 15px;
}

/* Fibonacci spiral visualization */
.fibonacci-spiral {
    position: relative;
    width: 400px;
    height: 400px;
    margin: 0 auto 50px;
}

/* Boxes representing Fibonacci squares */
.box {
    position: absolute;
    background-color: rgba(52, 152, 219, 0.1);
    border: 2px solid #3498db;
    border-radius: 4px;
}

.box-1 {
    width: 1px;
    height: 1px;
    bottom: 0;
    left: 0;
}

.box-2 {
    width: 1px;
    height: 1px;
    bottom: 0;
    left: 1px;
}

.box-3 {
    width: 2px;
    height: 2px;
    bottom: 0;
    left: 2px;
}

.box-4 {
    width: 3px;
    height: 3px;
    bottom: 0;
    left: 4px;
}

.box-5 {
    width: 5px;
    height: 5px;
    bottom: 3px;
    left: 4px;
}

.box-6 {
    width: 8px;
    height: 8px;
    bottom: 0;
    left: 9px;
}

.box-7 {
    width: 13px;
    height: 13px;
    bottom: 8px;
    left: 4px;
}

/* Scaled up for visibility (multiplied by 20) */
.fibonacci-spiral {
    transform: scale(20);
    transform-origin: bottom left;
    margin-left: 50px;
    margin-bottom: 50px;
}

/* The spiral curve */
.spiral {
    position: absolute;
    width: 1px;
    height: 1px;
    bottom: 0;
    left: 0;
    border: 1px solid transparent;
    border-top-right-radius: 100%;
    border-bottom-right-radius: 0;
    border-bottom-left-radius: 0;
    border-top-left-radius: 0;
    transform-origin: bottom left;
    box-shadow: 
        1px 0 0 0 #e74c3c,
        2px 1px 0 0 #e74c3c,
        4px 3px 0 0 #e74c3c,
        7px 4px 0 0 #e74c3c,
        12px 9px 0 0 #e74c3c;
}

/* Fibonacci number display */
.sequence-display {
    margin-top: 70px;
}

.number-row {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
}

.number {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 60px;
    height: 60px;
    background-color: #3498db;
    color: white;
    border-radius: 50%;
    font-weight: bold;
    font-size: 18px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    transition: transform 0.3s ease;
}

.number:hover {
    transform: scale(1.1);
    background-color: #2980b9;
}

/* Media queries for responsiveness */
@media (max-width: 768px) {
    .fibonacci-spiral {
        transform: scale(10);
        margin-left: 100px;
    }
    
    .number {
        width: 50px;
        height: 50px;
        font-size: 16px;
    }
}

@media (max-width: 480px) {
    .container {
        padding: 15px;
    }
    
    .fibonacci-spiral {
        transform: scale(7);
        margin-left: 30px;
    }
    
    .number {
        width: 40px;
        height: 40px;
        font-size: 14px;
    }
}`,
      active: true,
    },
  },
  markdown: {
    "/fibonacci.md": {
      code: `# The Fibonacci Sequence

## Introduction

The Fibonacci sequence is a series of numbers where each number is the sum of the two preceding ones, starting from 0 and 1. The sequence begins: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, ...

## Mathematical Definition

The Fibonacci sequence can be defined as:

- F(0) = 0
- F(1) = 1
- F(n) = F(n-1) + F(n-2) for n > 1

## Visual Representation

The Fibonacci sequence can be visualized as a spiral:

\`\`\`
     +-------+
     |+-----+|
     ||+---+||
     |||+-+|||
     |||| ||||
     |||\`-\`|||
     ||\`---\`||
     |\`-----\`|
     +-------+
\`\`\`

## Implementations

### JavaScript
\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}
\`\`\`

### Python
\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b
\`\`\`

## Properties

1. **Golden Ratio**: The ratio of consecutive Fibonacci numbers approaches the Golden Ratio (approximately 1.618).
2. **Recursion**: The sequence demonstrates a natural recursive pattern.
3. **Occurrence in Nature**: Fibonacci numbers appear in biological settings, such as:
   - Branching in trees
   - Arrangement of leaves on a stem
   - The family tree of honeybees
   - The spiral of shells

## Applications

- Architecture and design
- Financial markets
- Computer algorithms
- Music composition
- Natural phenomena modeling

## Table of Values

| n | F(n) | Ratio F(n)/F(n-1) |
|---|------|------------------|
| 0 | 0    | -                |
| 1 | 1    | -                |
| 2 | 1    | 1.000            |
| 3 | 2    | 2.000            |
| 4 | 3    | 1.500            |
| 5 | 5    | 1.667            |
| 6 | 8    | 1.600            |
| 7 | 13   | 1.625            |
| 8 | 21   | 1.615            |
| 9 | 34   | 1.619            |

As you can see, the ratio converges to the Golden Ratio (φ ≈ 1.618) as n increases.

---

*This markdown document demonstrates formatting features while explaining the Fibonacci sequence.*`,
      active: true,
    },
  },
  json: {
    "/fibonacci.json": {
      code: `{
  "name": "Fibonacci Sequence",
  "description": "A sequence of numbers where each is the sum of the two preceding ones",
  "mathematicalDefinition": {
    "base": [
      {"position": 0, "value": 0},
      {"position": 1, "value": 1}
    ],
    "recursive": "F(n) = F(n-1) + F(n-2) for n > 1"
  },
  "firstTenNumbers": [0, 1, 1, 2, 3, 5, 8, 13, 21, 34],
  "properties": [
    {
      "name": "Golden Ratio",
      "description": "The ratio of consecutive Fibonacci numbers approaches the Golden Ratio (approximately 1.618)",
      "approximation": 1.618034
    },
    {
      "name": "Sum Property",
      "description": "The sum of the first n Fibonacci numbers equals F(n+2) - 1"
    },
    {
      "name": "Square Sum",
      "description": "The sum of the squares of the first n Fibonacci numbers equals F(n) × F(n+1)"
    }
  ],
  "implementations": {
    "languages": [
      {
        "name": "JavaScript",
        "complexity": {
          "time": "O(n)",
          "space": "O(1)"
        },
        "code": "function fibonacci(n) { if (n <= 1) return n; let a = 0, b = 1; for (let i = 2; i <= n; i++) { const temp = a + b; a = b; b = temp; } return b; }"
      },
      {
        "name": "Python",
        "complexity": {
          "time": "O(n)",
          "space": "O(1)"
        },
        "code": "def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    a, b = 0, 1\\n    for _ in range(2, n + 1):\\n        a, b = b, a + b\\n    return b"
      }
    ],
    "algorithms": [
      {
        "name": "Iterative",
        "timeComplexity": "O(n)",
        "spaceComplexity": "O(1)",
        "preferred": true
      },
      {
        "name": "Recursive",
        "timeComplexity": "O(2^n)",
        "spaceComplexity": "O(n)",
        "preferred": false,
        "note": "Inefficient for large values of n"
      },
      {
        "name": "Matrix Exponentiation",
        "timeComplexity": "O(log n)",
        "spaceComplexity": "O(1)",
        "preferred": true,
        "note": "Most efficient for very large values of n"
      }
    ]
  },
  "applications": [
    "Mathematics",
    "Computer Algorithms",
    "Financial Markets",
    "Nature (Plant Growth Patterns)",
    "Art and Architecture"
  ],
  "metadata": {
    "author": "JSON Example Author",
    "version": "1.0.0",
    "lastUpdated": "2023-06-15T10:30:00Z",
    "license": "MIT"
  }
}`,
      active: true,
    },
  },
  xml: {
    "/fibonacci.xml": {
      code: `<?xml version="1.0" encoding="UTF-8"?>
<fibonacci>
  <metadata>
    <name>Fibonacci Sequence</name>
    <description>A series of numbers where each number is the sum of the two preceding ones</description>
    <author>XML Example Author</author>
    <version>1.0.0</version>
    <lastUpdated>2023-06-15T10:45:00Z</lastUpdated>
  </metadata>
  
  <mathematical-definition>
    <base>
      <term position="0">0</term>
      <term position="1">1</term>
    </base>
    <recursive-formula>F(n) = F(n-1) + F(n-2) for n > 1</recursive-formula>
  </mathematical-definition>
  
  <sequence>
    <number position="0">0</number>
    <number position="1">1</number>
    <number position="2">1</number>
    <number position="3">2</number>
    <number position="4">3</number>
    <number position="5">5</number>
    <number position="6">8</number>
    <number position="7">13</number>
    <number position="8">21</number>
    <number position="9">34</number>
  </sequence>
  
  <properties>
    <property name="Golden Ratio">
      <description>The ratio of consecutive Fibonacci numbers approaches the Golden Ratio (approximately 1.618)</description>
      <approximation>1.618034</approximation>
    </property>
    <property name="Sum Property">
      <description>The sum of the first n Fibonacci numbers equals F(n+2) - 1</description>
    </property>
    <property name="Square Sum">
      <description>The sum of the squares of the first n Fibonacci numbers equals F(n) × F(n+1)</description>
    </property>
  </properties>
  
  <implementations>
    <languages>
      <language name="JavaScript">
        <complexity>
          <time>O(n)</time>
          <space>O(1)</space>
        </complexity>
        <code>
function fibonacci(n) {
  if (n <= 1) return n;
  
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}
        </code>
      </language>
      <language name="Python">
        <complexity>
          <time>O(n)</time>
          <space>O(1)</space>
        </complexity>
        <code>
def fibonacci(n):
    if n <= 1:
        return n
    
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b
        </code>
      </language>
    </languages>
    
    <algorithms>
      <algorithm name="Iterative">
        <timeComplexity>O(n)</timeComplexity>
        <spaceComplexity>O(1)</spaceComplexity>
        <preferred>true</preferred>
      </algorithm>
      <algorithm name="Recursive">
        <timeComplexity>O(2^n)</timeComplexity>
        <spaceComplexity>O(n)</spaceComplexity>
        <preferred>false</preferred>
        <note>Inefficient for large values of n</note>
      </algorithm>
      <algorithm name="Matrix Exponentiation">
        <timeComplexity>O(log n)</timeComplexity>
        <spaceComplexity>O(1)</spaceComplexity>
        <preferred>true</preferred>
        <note>Most efficient for very large values of n</note>
      </algorithm>
    </algorithms>
  </implementations>
  
  <applications>
    <application>Mathematics</application>
    <application>Computer Algorithms</application>
    <application>Financial Markets</application>
    <application>Nature (Plant Growth Patterns)</application>
    <application>Art and Architecture</application>
  </applications>
</fibonacci>`,
    },
  },
};

export default languageFiles;

// Language options for the Sandbox component
export const languageOptions = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "markdown", label: "Markdown" },
  { value: "json", label: "JSON" },
  { value: "xml", label: "XML" },
];
