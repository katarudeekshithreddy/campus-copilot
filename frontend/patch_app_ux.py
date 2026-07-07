import re

with open("src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports for react-hot-toast and useEffect (if missing, but useEffect is probably there)
if "react-hot-toast" not in content:
    content = content.replace("import React, { useState", "import toast, { Toaster } from 'react-hot-toast';\nimport React, { useState")

# 2. Add Toaster inside return structure. Find the root div and add it right after.
# Wait, App returns a `<div className="app-layout">`
if "<Toaster" not in content:
    content = content.replace("<div className=\"app-layout\">", "<div className=\"app-layout\">\n      <Toaster position=\"bottom-right\" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />")

# 3. Replace showToast
old_toast_func = """  const showToast = (message, type="error") => {
    // Basic implementation; you can replace with react-toastify or similar later
    if(type === "error") {
      alert(`Error: ${message}`);
    } else {
      console.log(`Success: ${message}`);
    }
  };"""
# Actually, I don't know the exact lines of showToast. Let's do a regex replace for the whole function.
pattern = re.compile(r"const showToast = \(.*?=>\s*\{.*?\};", re.DOTALL)
new_toast_func = """const showToast = (message, type="error") => {
    if (type === "error") {
      toast.error(message);
    } else if (type === "success") {
      toast.success(message);
    } else {
      toast(message);
    }
  };"""
content = pattern.sub(new_toast_func, content)

# Also when a user saves a note or completes a task, the original code might not call showToast for success.
# Let's check `isCompleted = true` logic and save note logic.
# I'll just write a custom hook for the cycling strings at the top level of App
cycling_hook = """
const useAgenticLoading = (isLoading, flowType) => {
  const [textIndex, setTextIndex] = useState(0);
  
  const roadmapSteps = ["Initializing planning agent...", "Synthesizing module curriculum...", "Finalizing your custom path..."];
  const quizSteps = ["Analyzing module context...", "Formulating conceptual questions...", "Validating grading rubric..."];
  
  const steps = flowType === 'quiz' ? quizSteps : roadmapSteps;

  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => {
        setTextIndex((prev) => (prev + 1) % steps.length);
      }, 1500);
    } else {
      setTextIndex(0);
    }
    return () => clearInterval(interval);
  }, [isLoading, steps.length]);

  return steps[textIndex];
};
"""
if "useAgenticLoading" not in content:
    content = content.replace("export default function App() {", cycling_hook + "\nexport default function App() {")

# Add hook usage in App component
hook_usage = """
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const roadmapLoadingText = useAgenticLoading(isRoadmapLoading, 'roadmap');
  const quizLoadingText = useAgenticLoading(isQuizLoading, 'quiz');
"""
content = content.replace("const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);", "const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);" + hook_usage)

# Now, find the quiz generation start and end to set isQuizLoading
# Usually it's inside `generateQuiz` function
content = content.replace("const generateQuiz = async (", "const generateQuiz = async (")
if "const generateQuiz = async" in content:
    content = content.replace("const generateQuiz = async (moduleData, roadmapIndex, moduleIndex) => {", "const generateQuiz = async (moduleData, roadmapIndex, moduleIndex) => {\n    setIsQuizLoading(true);")
    content = content.replace("setQuizQuestions(parsedQuiz);", "setQuizQuestions(parsedQuiz);\n      setIsQuizLoading(false);")
    content = content.replace("alert(\"Error generating quiz\");", "showToast(\"Error generating quiz\", \"error\");\n      setIsQuizLoading(false);")


# Replace the static loading text for roadmap
content = content.replace("✨ {isRoadmapLoading ? 'Generating Structured Path...' : 'Generate Roadmap'}", "✨ {isRoadmapLoading ? roadmapLoadingText : 'Generate Roadmap'}")
content = content.replace("{isRoadmapLoading && activeRoadmapTab === 'create' && (", "{isRoadmapLoading && activeRoadmapTab === 'create' && (")

# Finally, let's inject a toast into task completion
# The task completion click handler sets `newRoadmaps[roadmapIdx].modules[moduleIdx].action_items[aIdx].isCompleted = !isCompleted`
task_completion_old = "item.isCompleted = !item.isCompleted;"
task_completion_new = """
item.isCompleted = !item.isCompleted;
if (item.isCompleted) {
  showToast("🟢 Task Completed! Dashboard metrics updated.", "success");
}
"""
content = content.replace(task_completion_old, task_completion_new)

# Save notes toast
save_notes_old = "setModuleNotes(newNotes);"
save_notes_new = """
setModuleNotes(newNotes);
showToast("💾 Context saved to AI Memory.", "success");
"""
content = content.replace(save_notes_old, save_notes_new)

with open("src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)

