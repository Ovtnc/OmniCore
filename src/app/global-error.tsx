'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error?.message || 'Beklenmeyen bir sorun oluştu. Sayfayı yenilemeyi deneyin.';
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          *{box-sizing:border-box;}
          :root{--background:0 0% 100%;--foreground:222.2 84% 4.9%;--primary:221.2 83.2% 53.3%;--primary-foreground:210 40% 98%;--muted-foreground:215.4 16.3% 46.9%;}
          body{min-height:100vh;margin:0;background:hsl(var(--background));color:hsl(var(--foreground));font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;}
          .wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;padding:1.5rem;text-align:center;min-height:100vh;}
          h1{font-size:1.25rem;font-weight:600;margin:0;}
          p{max-width:28rem;font-size:0.875rem;color:hsl(var(--muted-foreground));margin:0;}
          .btn{padding:0.5rem 1rem;font-size:0.875rem;font-weight:500;background:hsl(var(--primary));color:hsl(var(--primary-foreground));border:none;border-radius:0.375rem;cursor:pointer;}
          .btn:hover{opacity:0.9;}
        ` }} />
      </head>
      <body suppressHydrationWarning>
        <div className="wrap">
          <h1>Bir hata oluştu</h1>
          <p>{message}</p>
          <button type="button" onClick={() => reset()} className="btn">Yeniden dene</button>
        </div>
      </body>
    </html>
  );
}
