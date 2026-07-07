import re

with open("src/views/Dashboard.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Make sure compass/rocket is imported from lucide-react if we use it. We'll use Compass or PlusCircle.
if "PlusCircle" not in content:
    content = content.replace("ArrowRight } from 'lucide-react'", "ArrowRight, PlusCircle, Compass } from 'lucide-react'")

empty_state_code = """
      {/* Roadmap Portfolio View */}
      {roadmaps.length > 0 ? (
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
      ) : (
        <div className="glass-panel fade-in" style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginBottom: '2rem' }}>
          <Compass size={48} style={{ color: 'var(--accent-primary)', marginBottom: '1.5rem', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Your academic portfolio is empty.</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>Let's build your first context-aware roadmap and start tracking your progress.</p>
          <button 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', padding: '0.8rem 1.5rem' }}
            onClick={() => setActiveRoadmapTab('create')}
          >
            <PlusCircle size={20} /> Create New Path
          </button>
        </div>
      )}
"""

old_portfolio_start = "      {/* Roadmap Portfolio View */}\n      {roadmaps.length > 0 && ("
old_portfolio_end = "          </div>\n        </div>\n      )}"

# Extract the old portfolio block using regex
import re
pattern = re.compile(re.escape(old_portfolio_start) + r".*?" + re.escape(old_portfolio_end), re.DOTALL)
content = pattern.sub(empty_state_code.strip(), content)

with open("src/views/Dashboard.jsx", "w", encoding="utf-8") as f:
    f.write(content)
