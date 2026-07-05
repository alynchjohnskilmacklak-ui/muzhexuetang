export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', background: '#F7F4EF', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section style={{ width: 'min(92vw, 460px)', background: '#fff', border: '1px solid #EEE7E1', borderRadius: 18, padding: '36px 28px', textAlign: 'center', boxShadow: '0 12px 36px rgba(26,18,1,.08)' }}>
        <img src="/images/logo.jpg" alt="牧哲学堂" style={{ height: 44, maxWidth: '100%', objectFit: 'contain' }} />
        <h1 style={{ margin: '22px 0 8px', color: '#1A1201', fontSize: 26 }}>页面走丢了</h1>
        <p style={{ margin: '0 0 24px', color: '#7A6E60', lineHeight: 1.7 }}>你访问的页面不存在或已被移动</p>
        <a href="/" style={{ display: 'inline-block', padding: '10px 20px', borderRadius: 10, background: '#E8784A', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>返回首页</a>
      </section>
    </main>
  )
}
