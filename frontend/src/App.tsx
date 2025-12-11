import { useState, useEffect } from 'react'
import './App.css'

type User = { id: string; name: string; email: string } | null

function App() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(() => {})
  }, [])

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
      <div className="auth-bar">
        {user ? (
          <>
            <span>{user.name}</span>
            <a href="/api/auth/logout">Выйти</a>
          </>
        ) : (
          <a href="/api/auth/google">Войти через Google</a>
        )}
      </div>
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
