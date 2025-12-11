import { useState } from 'react'
import './App.css'

function App() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAsk = async () => {
    setLoading(true)
    setAnswer('')
    try {
      const res = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })
      const data = await res.json()
      setAnswer(data.answer || data.error)
    } catch {
      setAnswer('Ошибка запроса')
    }
    setLoading(false)
  }

  return (
    <div className="container">
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Введите вопрос"
      />
      <button onClick={handleAsk} disabled={loading || !question}>
        {loading ? 'Загрузка...' : 'Спросить'}
      </button>
      {answer && <div className="answer">{answer}</div>}
    </div>
  )
}

export default App
