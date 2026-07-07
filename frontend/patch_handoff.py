import re

def patch_app():
    with open("src/App.jsx", "r", encoding="utf-8") as f:
        content = f.read()

    # Add activeTutorPrompt state if not exists
    if "const [activeTutorPrompt" not in content:
        content = content.replace("const [apiKey, setApiKey] = useState(", "const [activeTutorPrompt, setActiveTutorPrompt] = useState(\"\");\n  const [apiKey, setApiKey] = useState(")

    # Add handlePracticeHandoff
    handoff_logic = """
  const handlePracticeHandoff = (taskName) => {
    const prompt = `I am ready to practice the following task: "${taskName}". Act as a senior pair programmer. Do NOT write the full code for me. Instead, give me the first conceptual step and guide me through building it in my local IDE.`;
    setActiveTutorPrompt(prompt);
    setCurrentView("tutor");
  };
"""
    if "const handlePracticeHandoff" not in content:
        content = content.replace("const recordActivity = () => {", handoff_logic + "\n  const recordActivity = () => {")

    # Replace practice logic
    old_practice = """                                          setChatInput(`I need to practice: ${item.task_name} (Topic: ${roadmapData.roadmap_title}). Can you give me a coding exercise?`);
                                          setCurrentView('tutor');"""
    new_practice = """                                          handlePracticeHandoff(item.task_name);"""
    
    content = content.replace(old_practice, new_practice)

    # Replace Tutor component rendering
    old_tutor = "<Tutor roadmaps={roadmaps} activeRoadmapId={activeRoadmapTab} />"
    new_tutor = "<Tutor roadmaps={roadmaps} activeRoadmapId={activeRoadmapTab} activeTutorPrompt={activeTutorPrompt} setActiveTutorPrompt={setActiveTutorPrompt} />"
    content = content.replace(old_tutor, new_tutor)

    with open("src/App.jsx", "w", encoding="utf-8") as f:
        f.write(content)


def patch_tutor():
    with open("src/views/Tutor.jsx", "r", encoding="utf-8") as f:
        content = f.read()

    # Change signature
    old_sig = "export default function Tutor({ roadmaps, activeRoadmapId }) {"
    new_sig = "export default function Tutor({ roadmaps, activeRoadmapId, activeTutorPrompt, setActiveTutorPrompt }) {"
    content = content.replace(old_sig, new_sig)

    # Add useEffect
    use_effect_code = """
  useEffect(() => {
    if (activeTutorPrompt) {
      setInputValue(activeTutorPrompt);
      setActiveTutorPrompt("");
    }
  }, [activeTutorPrompt, setInputValue, setActiveTutorPrompt]);
"""
    if "if (activeTutorPrompt)" not in content:
        content = content.replace("const [isGenerating, setIsGenerating] = useState(false);", "const [isGenerating, setIsGenerating] = useState(false);\n" + use_effect_code)

    with open("src/views/Tutor.jsx", "w", encoding="utf-8") as f:
        f.write(content)

patch_app()
patch_tutor()
print("Patched.")
