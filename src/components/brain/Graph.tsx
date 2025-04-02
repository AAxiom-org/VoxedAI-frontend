import React, { useState, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import MarkdownRenderer from './MarkdownRenderer';

// Define TypeScript interfaces
interface GraphNode {
  id: string;
  group: number;
  label: string;
  size?: number;
  type?: 'circle' | 'text';
  color?: string;
  __bckgDimensions?: number[];
  x?: number;
  y?: number;
  noteId?: string;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface DetailedGraphs {
  [key: string]: GraphData;
}

const HierarchicalGraph: React.FC = () => {
  // State to track whether we're in the main view or a node's detailed view
  const [currentView, setCurrentView] = useState<'main' | 'detailed'>('main');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [showMarkdown, setShowMarkdown] = useState<boolean>(false);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const fgRef = useRef<any>(null);
  
  // Update mock content with more notes
  const mockMarkdownData: Record<string, string> = {
    "Concept1": `# Machine Learning
    
Machine learning is a subset of artificial intelligence that focuses on developing systems that learn from data.

## Key Approaches
- **Supervised Learning**: Training with labeled data
- **Unsupervised Learning**: Finding patterns without labels
- **Reinforcement Learning**: Learning through interaction with an environment

## Common Applications
1. Prediction and forecasting
2. Image and speech recognition
3. Natural language processing
4. Recommendation systems

\`\`\`python
# Simple linear regression example
import sklearn
from sklearn.linear_model import LinearRegression

model = LinearRegression()
model.fit(X_train, y_train)
predictions = model.predict(X_test)
\`\`\`
$$
f(x) = 3x^2, \\quad g(x) = 9 + 8x
$$
*Note: The solution is derived using standard calculus rules and does not rely on the provided context files.*
![Machine Learning Workflow](https://example.com/ml-workflow.png)
    `,
    "Concept2": `# Neural Networks
    
Neural networks are computing systems inspired by the biological neural networks in animal brains.

## Architecture
- **Input Layer**: Receives raw data
- **Hidden Layers**: Process information
- **Output Layer**: Produces final result

## Types of Neural Networks
- Feedforward Neural Networks
- Convolutional Neural Networks (CNNs)
- Recurrent Neural Networks (RNNs)
- Transformers

\`\`\`javascript
// Simple neural network in TensorFlow.js
const model = tf.sequential();
model.add(tf.layers.dense({units: 100, activation: 'relu', inputShape: [10]}));
model.add(tf.layers.dense({units: 1, activation: 'sigmoid'}));
model.compile({loss: 'binaryCrossentropy', optimizer: 'adam'});
\`\`\`

### YouTube: Understanding Neural Networks
YouTube: https://www.youtube.com/watch?v=aircAruvnKk
    `,
    "Concept3": `# Computer Vision
    
Computer vision is an interdisciplinary field that enables computers to gain high-level understanding from digital images or videos.

## Main Tasks
- **Image Classification**: Categorizing images
- **Object Detection**: Identifying and locating objects
- **Segmentation**: Pixel-level classification
- **Image Generation**: Creating new images

## Popular Libraries and Frameworks
- OpenCV
- TensorFlow/Keras
- PyTorch
- YOLO

\`\`\`python
# Using OpenCV to detect faces
import cv2

face_cascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')
img = cv2.imread('image.jpg')
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
faces = face_cascade.detectMultiScale(gray, 1.1, 4)

for (x, y, w, h) in faces:
    cv2.rectangle(img, (x, y), (x+w, y+h), (255, 0, 0), 2)
\`\`\`
    `,
    "Concept4": `# Natural Language Processing
    
NLP is a field that focuses on the interaction between computers and human language.

## Core Components
- **Tokenization**: Breaking text into tokens
- **Part-of-speech Tagging**: Identifying word types
- **Named Entity Recognition**: Identifying entities
- **Sentiment Analysis**: Determining emotion/opinion

## Modern Approaches
- Word Embeddings (Word2Vec, GloVe)
- Transformers (BERT, GPT)
- Transfer Learning
- Few-shot and Zero-shot Learning

\`\`\`python
# Simple sentiment analysis with NLTK
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer

sia = SentimentIntensityAnalyzer()
text = "I love this new natural language processing algorithm!"
print(sia.polarity_scores(text))
\`\`\`

<details>
<summary>Advanced NLP Resources</summary>
- Stanford NLP Group: https://nlp.stanford.edu/
- Hugging Face: https://huggingface.co/
- spaCy: https://spacy.io/
- NLTK: https://www.nltk.org/
</details>
    `,
    "Concept5": `# Reinforcement Learning
    
Reinforcement learning is training algorithms to make decisions by rewarding desired behaviors and punishing undesired ones.

## Key Concepts
- **Agent**: The learner or decision-maker
- **Environment**: What the agent interacts with
- **Actions**: What the agent can do
- **Rewards**: Feedback from the environment

## Popular Algorithms
- Q-Learning
- Deep Q Networks (DQN)
- Policy Gradients
- Proximal Policy Optimization (PPO)

\`\`\`python
# Simple Q-learning implementation
import numpy as np

# Initialize Q-table
Q = np.zeros([states, actions])
alpha = 0.1  # Learning rate
gamma = 0.9  # Discount factor

# Q-learning update
Q[state, action] = Q[state, action] + alpha * (reward + gamma * np.max(Q[next_state, :]) - Q[state, action])
\`\`\`

## Applications
- Games (AlphaGo, OpenAI Five)
- Robotics
- Autonomous vehicles
- Resource management
    `,
    "Note1": `# Supervised Learning

Supervised learning uses labeled training data to learn the mapping function from input variables to output variables.

## Examples
- Linear Regression
- Logistic Regression
- Support Vector Machines
- Decision Trees
- Neural Networks

## When to Use
- When you have labeled data
- For classification or regression tasks
- When you want clear predictions
    `,
    "Note2": `# Unsupervised Learning

Unsupervised learning finds patterns or intrinsic structures in input data without labeled responses.

## Common Techniques
- Clustering (K-means, Hierarchical)
- Dimensionality Reduction (PCA, t-SNE)
- Association Rule Learning
- Anomaly Detection

## Applications
- Customer segmentation
- Feature learning
- Structure discovery
- Density estimation
    `,
    "Note3": `# Regression Analysis

Regression is used to predict continuous values, such as price, probability, or temperature.

## Types of Regression
- Linear Regression
- Polynomial Regression
- Ridge Regression
- Lasso Regression
- Elastic Net

## Model Evaluation
- Mean Squared Error (MSE)
- Root Mean Squared Error (RMSE)
- R-squared
- Adjusted R-squared
    `,
    "Note4": `# Classification

Classification is the process of categorizing data points into predefined classes.

## Popular Classifiers
- Logistic Regression
- Naive Bayes
- K-Nearest Neighbors
- Support Vector Machines
- Random Forests

## Evaluation Metrics
- Accuracy
- Precision
- Recall
- F1 Score
- ROC Curve and AUC
    `,
    "Concept2-Note1": `# Perceptron
    
The perceptron is the simplest type of artificial neural network unit. It models a single neuron that applies a step function to the weighted sum of its inputs.

## History
- Introduced by Frank Rosenblatt in 1957
- Originally implemented in hardware as the Mark I Perceptron

## Key Properties
- Binary classification
- Linear decision boundary
- Simple learning algorithm

\`\`\`python
# Simple perceptron implementation
class Perceptron:
    def __init__(self, learning_rate=0.01, n_iterations=1000):
        self.learning_rate = learning_rate
        self.n_iterations = n_iterations
        self.weights = None
        self.bias = None
        
    def fit(self, X, y):
        n_samples, n_features = X.shape
        self.weights = np.zeros(n_features)
        self.bias = 0
        
        for _ in range(self.n_iterations):
            for idx, x_i in enumerate(X):
                linear_output = np.dot(x_i, self.weights) + self.bias
                y_predicted = 1 if linear_output >= 0 else 0
                
                update = self.learning_rate * (y[idx] - y_predicted)
                self.weights += update * x_i
                self.bias += update
\`\`\`
    `,
    "Concept2-Note2": `# Hidden Layers
    
Hidden layers in neural networks are layers of neurons between the input and output layers, enabling the network to learn complex, non-linear patterns.

## Importance
- Enable representation of non-linear decision boundaries
- Allow hierarchical feature learning
- Key to deep learning capabilities

## Activation Functions
- ReLU (Rectified Linear Unit)
- Sigmoid
- Tanh
- Leaky ReLU
- Swish/SiLU
    `,
    "Concept2-Note3": `# Backpropagation
    
Backpropagation is an algorithm for training neural networks by calculating gradients and updating weights to minimize loss.

## Process
1. Forward pass: calculate predictions
2. Compute loss
3. Backward pass: calculate gradients
4. Update weights

## Challenges
- Vanishing gradients
- Exploding gradients
- Local minima
- Computational complexity
    `,
    "Concept3-Note1": `# Image Classification
    
Image classification is the task of assigning a label or category to an entire image.

## Approaches
- Traditional: SIFT, HOG features with SVMs/Random Forests
- Modern: Convolutional Neural Networks (CNNs)
- State-of-the-art: Vision Transformers (ViT)

## Popular Models
- ResNet
- EfficientNet
- Vision Transformer (ViT)
- ConvNeXT

\`\`\`python
# Using a pre-trained CNN for image classification
from tensorflow.keras.applications import ResNet50
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.resnet50 import preprocess_input, decode_predictions
import numpy as np

model = ResNet50(weights='imagenet')

img_path = 'elephant.jpg'
img = image.load_img(img_path, target_size=(224, 224))
x = image.img_to_array(img)
x = np.expand_dims(x, axis=0)
x = preprocess_input(x)

preds = model.predict(x)
print('Predicted:', decode_predictions(preds, top=3)[0])
\`\`\`
    `,
    "Concept3-Note2": `# Object Detection
    
Object detection involves both identifying and localizing objects within an image.

## Key Algorithms
- R-CNN family: R-CNN, Fast R-CNN, Faster R-CNN
- Single-shot detectors: SSD, YOLO
- Anchor-free approaches: CenterNet, FCOS

## Performance Metrics
- Precision & Recall
- Average Precision (AP)
- mAP (mean Average Precision)
- Intersection over Union (IoU)

![Object Detection Example](https://example.com/object-detection.jpg)
    `,
    "Concept3-Note3": `# Convolutional Neural Networks
    
CNNs are specialized neural networks designed to process grid-like data such as images.

## Key Components
- Convolutional layers: Apply filters to detect features
- Pooling layers: Reduce dimensionality
- Fully connected layers: Final classification

## CNN Architecture Evolution
- LeNet (1998)
- AlexNet (2012)
- VGG (2014)
- ResNet (2015)
- EfficientNet (2019)
    `,
    "Concept4-Note1": `# Tokenization
    
Tokenization is the process of breaking text into smaller units such as words, subwords, or characters.

## Types of Tokenization
- Word tokenization
- Subword tokenization (BPE, WordPiece, SentencePiece)
- Character tokenization

## Tools
- NLTK
- spaCy
- Hugging Face Tokenizers

\`\`\`python
# Word tokenization with NLTK
import nltk
text = "Tokenization is the first step in many NLP tasks."
tokens = nltk.word_tokenize(text)
print(tokens)
# ['Tokenization', 'is', 'the', 'first', 'step', 'in', 'many', 'NLP', 'tasks', '.']
\`\`\`
    `,
    "Concept4-Note2": `# Word Embeddings
    
Word embeddings are dense vector representations of words that capture semantic meaning.

## Popular Embedding Methods
- Word2Vec
- GloVe
- FastText
- Contextual embeddings: ELMo, BERT

## Properties
- Similar words have similar vectors
- Support semantic operations (e.g., king - man + woman ≈ queen)
- Can transfer to downstream tasks

\`\`\`python
# Loading GloVe embeddings
import numpy as np

embeddings_dict = {}
with open("glove.6B.100d.txt", "r", encoding="utf-8") as f:
    for line in f:
        values = line.split()
        word = values[0]
        vector = np.asarray(values[1:], "float32")
        embeddings_dict[word] = vector
\`\`\`
    `,
    "Concept4-Note3": `# Transformers
    
Transformers are neural network architectures that use self-attention mechanisms to process sequential data.

## Key Innovations
- Attention mechanisms
- Parallelizable training (vs. sequential RNNs)
- Positional encoding
- Multi-head attention

## Popular Models
- BERT
- GPT family
- T5
- RoBERTa
- XLNet

## Applications
- Machine translation
- Text summarization
- Question answering
- Text generation
    `,
    "Concept5-Note1": `# Agents in Reinforcement Learning
    
In reinforcement learning, an agent is the entity that takes actions in an environment to maximize reward.

## Agent Components
- Policy: Strategy for selecting actions
- Value function: Estimates expected rewards
- Model: Agent's representation of the environment (optional)

## Agent Types
- Value-based
- Policy-based
- Actor-critic
- Model-based

\`\`\`python
# Simple RL agent with OpenAI Gym
import gym
import numpy as np

env = gym.make("CartPole-v1")
n_states = 10  # Discretized state space
n_actions = env.action_space.n
Q = np.zeros((n_states, n_actions))

# Training loop would follow...
\`\`\`
    `,
    "Concept5-Note2": `# Rewards in Reinforcement Learning
    
Rewards are signals from the environment that the agent aims to maximize over time.

## Reward Design Challenges
- Sparse rewards
- Reward shaping
- Delayed rewards
- Exploration vs. exploitation

## Reward Functions
- Binary rewards (success/failure)
- Continuous rewards (distance-based)
- Hierarchical rewards
- Intrinsic motivation
    `,
    "Concept5-Note3": `# Q-Learning
    
Q-learning is a model-free reinforcement learning algorithm that learns a value function for each state-action pair.

## Algorithm
1. Initialize Q-values
2. For each step:
   - Select action (e.g., ε-greedy)
   - Take action, observe reward and next state
   - Update Q-value with Bellman equation
   - Repeat

## Variants
- Deep Q-Networks (DQN)
- Double DQN
- Dueling DQN
- Rainbow DQN

\`\`\`python
# Q-learning update equation
Q[state, action] = Q[state, action] + alpha * (
    reward + gamma * np.max(Q[next_state, :]) - Q[state, action]
)
\`\`\`
    `
  };
  
  // Define our graph data
  const mainGraphData: GraphData = {
    nodes: [
      {id: "Concept1", group: 1, label: "Machine Learning", size: 15, color: "#4361EE", noteId: "Concept1"},
      {id: "Concept2", group: 2, label: "Neural Networks", size: 12, color: "#3A0CA3", noteId: "Concept2"},
      {id: "Concept3", group: 3, label: "Computer Vision", size: 14, color: "#7209B7", noteId: "Concept3"},
      {id: "Concept4", group: 4, label: "NLP", size: 13, color: "#F72585", noteId: "Concept4"},
      {id: "Concept5", group: 5, label: "Reinforcement Learning", size: 11, color: "#4CC9F0", noteId: "Concept5"}
    ],
    links: [
      {source: "Concept1", target: "Concept2"},
      {source: "Concept1", target: "Concept3"},
      {source: "Concept1", target: "Concept4"},
      {source: "Concept1", target: "Concept5"},
      {source: "Concept2", target: "Concept3"},
      {source: "Concept4", target: "Concept5"}
    ]
  };
  
  // Define detailed subgraphs for each main node
  const detailedGraphs: DetailedGraphs = {
    "Concept1": {
      nodes: [
        {id: "Concept1", group: 1, label: "Machine Learning", size: 20, type: "circle", noteId: "Concept1"},
        {id: "Note1", group: 1, label: "Supervised Learning uses labeled data", type: "text", noteId: "Note1"},
        {id: "Note2", group: 1, label: "Unsupervised Learning finds patterns without labels", type: "text", noteId: "Note2"},
        {id: "Note3", group: 1, label: "Regression predicts continuous values", type: "text", noteId: "Note3"},
        {id: "Note4", group: 1, label: "Classification assigns categories", type: "text", noteId: "Note4"}
      ],
      links: [
        {source: "Concept1", target: "Note1"},
        {source: "Concept1", target: "Note2"},
        {source: "Concept1", target: "Note3"},
        {source: "Concept1", target: "Note4"}
      ]
    },
    "Concept2": {
      nodes: [
        {id: "Concept2", group: 2, label: "Neural Networks", size: 20, type: "circle", noteId: "Concept2"},
        {id: "Note1", group: 2, label: "Perceptron is the simplest neural unit", type: "text", noteId: "Concept2-Note1"},
        {id: "Note2", group: 2, label: "Hidden layers enable complex pattern recognition", type: "text", noteId: "Concept2-Note2"},
        {id: "Note3", group: 2, label: "Backpropagation adjusts weights during training", type: "text", noteId: "Concept2-Note3"}
      ],
      links: [
        {source: "Concept2", target: "Note1"},
        {source: "Concept2", target: "Note2"},
        {source: "Concept2", target: "Note3"}
      ]
    },
    "Concept3": {
      nodes: [
        {id: "Concept3", group: 3, label: "Computer Vision", size: 20, type: "circle", noteId: "Concept3"},
        {id: "Note1", group: 3, label: "Image classification identifies objects", type: "text", noteId: "Concept3-Note1"},
        {id: "Note2", group: 3, label: "Object detection locates items in images", type: "text", noteId: "Concept3-Note2"},
        {id: "Note3", group: 3, label: "CNNs use filters to detect features", type: "text", noteId: "Concept3-Note3"}
      ],
      links: [
        {source: "Concept3", target: "Note1"},
        {source: "Concept3", target: "Note2"},
        {source: "Concept3", target: "Note3"}
      ]
    },
    "Concept4": {
      nodes: [
        {id: "Concept4", group: 4, label: "NLP", size: 20, type: "circle", noteId: "Concept4"},
        {id: "Note1", group: 4, label: "Tokenization breaks text into units", type: "text", noteId: "Concept4-Note1"},
        {id: "Note2", group: 4, label: "Word embeddings represent semantic meaning", type: "text", noteId: "Concept4-Note2"},
        {id: "Note3", group: 4, label: "Transformers power modern language models", type: "text", noteId: "Concept4-Note3"}
      ],
      links: [
        {source: "Concept4", target: "Note1"},
        {source: "Concept4", target: "Note2"},
        {source: "Concept4", target: "Note3"}
      ]
    },
    "Concept5": {
      nodes: [
        {id: "Concept5", group: 5, label: "Reinforcement Learning", size: 20, type: "circle", noteId: "Concept5"},
        {id: "Note1", group: 5, label: "Agents take actions in environments", type: "text", noteId: "Concept5-Note1"},
        {id: "Note2", group: 5, label: "Rewards guide policy optimization", type: "text", noteId: "Concept5-Note2"},
        {id: "Note3", group: 5, label: "Q-learning estimates action values", type: "text", noteId: "Concept5-Note3"}
      ],
      links: [
        {source: "Concept5", target: "Note1"},
        {source: "Concept5", target: "Note2"},
        {source: "Concept5", target: "Note3"}
      ]
    }
  };
  
  useEffect(() => {
    // Set initial graph data
    setGraphData(mainGraphData);
  }, []);
  
  useEffect(() => {
    // When view changes, update the graph
    if (currentView === 'main') {
      setGraphData(mainGraphData);
    } else if (currentView === 'detailed' && selectedNode) {
      const nodeId = selectedNode.id;
      if (detailedGraphs[nodeId]) {
        setGraphData(detailedGraphs[nodeId]);
      }
    }
  }, [currentView, selectedNode]);
  
  useEffect(() => {
    // When the graph data changes or is initially set
    if (fgRef.current) {
      // Customize the forces for better spacing with larger nodes
      fgRef.current.d3Force('charge').strength(-3000); // Stronger repulsion between nodes
      
      // Dynamically adjust link distance based on connected node label lengths
      if (graphData) {
        graphData.links.forEach((link) => {
          const sourceNode = typeof link.source === 'string' 
            ? graphData.nodes.find(n => n.id === link.source) 
            : link.source as GraphNode;
          
          const targetNode = typeof link.target === 'string'
            ? graphData.nodes.find(n => n.id === link.target)
            : link.target as GraphNode;
            
          if (sourceNode && targetNode) {
            const avgLabelLength = (sourceNode.label.length + targetNode.label.length) / 2;
            // Base distance + additional distance based on label length
            const distance = 150 + Math.min(avgLabelLength * 5, 150);
            
            // Set custom distance for this link
            // Note: This requires modifying the link object
            (link as any).distance = distance;
          }
        });
      }
      
      // Override the default link force with a custom one that respects individual link distances
      fgRef.current.d3Force('link').distance((link: any) => link.distance || 240);
      fgRef.current.d3Force('center').strength(0.12); // Slightly stronger centering force
      
      // Reheat simulation to apply new forces
      fgRef.current.d3ReheatSimulation();
    }
  }, [graphData]);
  
  // Handle node click
  const handleNodeClick = (node: GraphNode) => {
    if (currentView === 'main' && detailedGraphs[node.id]) {
      setSelectedNode(node);
      setCurrentView('detailed');
    } else if (node.noteId) {
      // Show markdown content for this node
      if (mockMarkdownData[node.noteId]) {
        setMarkdownContent(mockMarkdownData[node.noteId]);
        setShowMarkdown(true);
      }
    }
  };
  
  // Handle back button click
  const handleBackClick = () => {
    setCurrentView('main');
    setSelectedNode(null);
    setGraphData(mainGraphData);
  };
  
  // Add close markdown handler
  const handleCloseMarkdown = () => {
    setShowMarkdown(false);
    setMarkdownContent('');
  };
  
  // Render function for nodes
  const renderNode = (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.label || node.id;
    const fontSize = 14; // Fixed font size
    ctx.font = `${fontSize}px sans-serif`;
    
    // Calculate line breaking for long text
    const maxLineWidth = 200; // Maximum width for a line of text
    let lines: string[] = [];
    
    // Split label into lines if it's too long
    if (ctx.measureText(label).width > maxLineWidth) {
      let currentLine = '';
      const words = label.split(' ');
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const testWidth = ctx.measureText(testLine).width;
        
        if (testWidth > maxLineWidth && currentLine !== '') {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
    } else {
      lines = [label];
    }
    
    // Calculate total text height
    const lineHeight = fontSize * 1.2;
    const textHeight = lines.length * lineHeight;
    
    // Find the widest line
    const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    
    if (node.type === 'text') {
      // Text nodes with background
      const padding = fontSize * 0.8;
      const bckgDimensions = [textWidth + padding * 2, textHeight + padding];
      
      // Make text nodes appear clickable with a blue tint for notes
      const isClickable = !!node.noteId;
      const bgColor = isClickable ? 'rgba(232, 240, 255, 0.95)' : 'rgba(252, 252, 255, 0.9)';
      const borderColor = isClickable ? '#4361EE' : '#e0e0e0';
      
      // Background rectangle with border
      ctx.fillStyle = bgColor;
      ctx.fillRect(
        node.x! - bckgDimensions[0] / 2, 
        node.y! - bckgDimensions[1] / 2, 
        bckgDimensions[0],
        bckgDimensions[1]
      );
      
      // Add border to indicate clickability
      if (isClickable) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          node.x! - bckgDimensions[0] / 2, 
          node.y! - bckgDimensions[1] / 2, 
          bckgDimensions[0],
          bckgDimensions[1]
        );
      }
      
      // Text itself
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isClickable ? '#1a365d' : '#333333';
      
      // Draw each line of text
      lines.forEach((line, i) => {
        const yPos = node.y! - (textHeight / 2) + (i * lineHeight) + (lineHeight / 2);
        ctx.fillText(line, node.x!, yPos);
      });
      
      // Add a small info icon for clickable notes
      if (isClickable) {
        const iconSize = fontSize * 0.8;
        const iconX = node.x! + bckgDimensions[0] / 2 - iconSize;
        const iconY = node.y! - bckgDimensions[1] / 2 + iconSize;
        
        // Draw info circle
        ctx.beginPath();
        ctx.arc(iconX, iconY, iconSize / 2, 0, 2 * Math.PI, false);
        ctx.fillStyle = '#4361EE';
        ctx.fill();
        
        // Draw 'i' letter
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${iconSize * 0.8}px sans-serif`;
        ctx.fillText('i', iconX, iconY + iconSize * 0.1);
      }
      
      // Store dimensions for pointer area
      node.__bckgDimensions = bckgDimensions;
    } else {
      // Regular circle nodes
      // Calculate node size based on text width to ensure it fits
      const nodeSize = Math.max(textWidth / 1.5, textHeight / 1.5, node.size || 10);
      
      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, nodeSize, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.color || '#4361EE'; // Use modern default color
      ctx.fill();
      
      // Node border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Add label inside the circle
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff'; // White text for better contrast
      
      // Draw each line of text
      lines.forEach((line, i) => {
        const yOffset = (i - (lines.length - 1) / 2) * lineHeight;
        ctx.fillText(line, node.x!, node.y! + yOffset);
      });
      
      // Store node size for pointer area
      node.__bckgDimensions = [nodeSize * 2, nodeSize * 2];
    }
  };
  
  // Handle pointer area for interactive nodes
  const handlePointerArea = (node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = color;
    if (node.type === 'text') {
      const bckgDimensions = node.__bckgDimensions;
      if (bckgDimensions) {
        ctx.fillRect(
          node.x! - bckgDimensions[0] / 2, 
          node.y! - bckgDimensions[1] / 2, 
          bckgDimensions[0],
          bckgDimensions[1]
        );
      }
    } else {
      // For circle nodes, use the stored dimensions
      const dimensions = node.__bckgDimensions;
      if (dimensions) {
        const radius = dimensions[0] / 2;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);
        ctx.fill();
      }
    }
  };
  
  return (
    <div className="relative w-full h-screen bg-white">
      {currentView === 'detailed' && (
        <button 
          onClick={handleBackClick}
          className="absolute top-4 left-4 z-10 bg-white px-4 py-2 rounded shadow-md border border-gray-200 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          ← Back to Main View
        </button>
      )}
      
      {graphData && (
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeAutoColorBy="group"
          linkWidth={2}
          linkColor={() => "#999"}
          nodePointerAreaPaint={handlePointerArea}
          nodeCanvasObject={renderNode}
          onNodeClick={handleNodeClick}
          cooldownTicks={100}
          d3AlphaDecay={0.01}
          d3VelocityDecay={0.3}
          nodeRelSize={6}
          onEngineStop={() => fgRef.current?.zoomToFit(400, 150)}
          width={window.innerWidth}
          height={window.innerHeight}
        />
      )}
      
      {/* Markdown popup overlay */}
      {showMarkdown && (
        <div className="fixed inset-0 z-20 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
            <button 
              onClick={handleCloseMarkdown}
              className="absolute z-1 top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Scrollable content */}
            <div className="flex-1 overflow-auto p-6 pt-20">
              <MarkdownRenderer content={`### Relevant Notes: [Note1](https://example.com/note1), [Note2](https://example.com/note2), [Note3](https://example.com/note3), [Note4](https://example.com/note4), [Note5](https://example.com/note5), [Note6](https://example.com/note6), [Note7](https://example.com/note7), [Note8](https://example.com/note8), [Note9](https://example.com/note9), [Note10](https://example.com/note10) \n --- \n \n ${markdownContent}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HierarchicalGraph;