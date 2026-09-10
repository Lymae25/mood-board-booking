'use client'
import { useState } from 'react'

export default function SceneFlowchart({ scenes, onSceneClick }: { scenes: any[], onSceneClick: (scene: any) => void }) {
  const [selectedScene, setSelectedScene] = useState<any>(null)

  if (scenes.length === 0) {
    return <div style={{ textAlign: 'center', color: '#666', padding: '60px' }}>No scenes yet</div>
  }

  return (
    <div style={{ padding: '40px', backgroundColor: '#000' }}>
      {/* Flowchart */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', overflowX: 'auto', paddingBottom: '40px', marginBottom: '40px', borderBottom: '1px solid #333' }}>
        {scenes.map((scene, idx) => (
          <div key={scene.id} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button
              onClick={() => { setSelectedScene(scene); onSceneClick(scene) }}
              style={{
                padding: '20px 30px',
                backgroundColor: selectedScene?.id === scene.id ? '#222' : '#111',
                border: selectedScene?.id === scene.id ? '2px solid #fff' : '1px solid #333',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
                textAlign: 'center',
                minWidth: '150px',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>SCENE {scene.sceneNumber}</div>
              <div style={{ fontSize: '14px' }}>{scene.title}</div>
            </button>
            {idx < scenes.length - 1 && (
              <div style={{ fontSize: '24px', color: '#666' }}>→</div>
            )}
          </div>
        ))}
      </div>

      {/* Scene Details */}
      {selectedScene && (
        <div style={{ backgroundColor: '#111', border: '1px solid #333', padding: '40px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px' }}>Scene {selectedScene.sceneNumber}: {selectedScene.title}</h2>
          
          {selectedScene.imageUrl && (
            <img src={selectedScene.imageUrl} alt={selectedScene.title} style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', marginBottom: '30px' }} />
          )}

          <div style={{ backgroundColor: '#000', padding: '20px', border: '1px solid #333', borderRadius: '4px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', color: '#fff' }}>What Happens</h3>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.8' }}>{selectedScene.description}</p>
          </div>
        </div>
      )}
    </div>
  )
}
