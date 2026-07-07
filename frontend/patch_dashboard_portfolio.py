import re

with open("src/views/Dashboard.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add imports for LayoutDashboard or Map if needed, I'll use Map which is already available in App.jsx but maybe not imported in Dashboard.jsx.
# Actually I'll just use Target which is already imported. Or add BookOpen.
if "BookOpen" not in content:
    content = content.replace("ExternalLink } from 'lucide-react'", "ExternalLink, BookOpen, ArrowRight } from 'lucide-react'")

helper_func = """
const calculateRoadmapProgress = (rm) => {
  let total = 0;
  let completed = 0;
  rm.modules.forEach(m => {
    m.action_items.forEach(a => {
      total++;
      if (a.isCompleted) completed++;
    });
  });
  return total === 0 ? 0 : Math.round((completed / total) * 100);
};

export default function Dashboard"""

content = content.replace("export default function Dashboard", helper_func)

portfolio_ui = """
      {/* Roadmap Portfolio View */}
      {roadmaps.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={20} className="text-accent" /> Active Roadmaps Portfolio
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {roadmaps.map((rm, idx) => {
              const progress = calculateRoadmapProgress(rm);
              const ragColor = progress < 30 ? 'var(--accent-warning)' : progress < 70 ? '#f59e0b' : 'var(--accent-success)'; // Use red/amber/green logic
              
              return (
                <div key={idx} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', overflow: 'hidden' }}>
                  {/* Accent Top Border */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: ragColor }}></div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>{rm.roadmap_title}</h4>
                    <span style={{ fontWeight: 'bold', color: ragColor }}>{progress}%</span>
                  </div>
                  
                  {/* Progress Bar Container */}
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: ragColor, transition: 'width 0.5s ease-out' }}></div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {progress === 100 ? 'Completed 🎉' : 'In Progress'}
                    </span>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      onClick={() => setActiveRoadmapTab(idx)}
                    >
                      Resume <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Insights */}"""

content = content.replace("{/* Recent Insights */}", portfolio_ui)

with open("src/views/Dashboard.jsx", "w", encoding="utf-8") as f:
    f.write(content)
