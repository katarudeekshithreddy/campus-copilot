import re

with open("src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add import
import_stmt = "import Tutor from './views/Tutor'\nimport './index.css'"
content = content.replace("import './index.css'", import_stmt)

# Replace case 'tutor':
# It starts at `      case 'tutor':`
# and ends right before `      case 'security':`
pattern = re.compile(r"      case 'tutor':\s*return \(.*?case 'security':", re.DOTALL)

replacement = """      case 'tutor':
        return (
          <Tutor roadmaps={roadmaps} activeRoadmapId={activeRoadmapTab} />
        );
      case 'security':"""

content = pattern.sub(replacement, content)

with open("src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)
