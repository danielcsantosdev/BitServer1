import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Inicialização dos clientes Supabase e Resend
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// Rota para cadastrar novo inscrito
app.post('/api/subscribe', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Forneça um e-mail válido.' });
  }

  try {
    // 1. Salvar no Supabase
    const { data, error: dbError } = await supabase
      .from('subscribers')
      .insert([{ email }]);

    if (dbError) {
      // Código de erro do Postgres para valor duplicado
      if (dbError.code === '23505') {
        return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
      }
      throw dbError;
    }

    // 2. Enviar e-mail de boas-vindas via Resend
    await resend.emails.send({
      from: 'BitSize <onboarding@resend.dev>', // Substitua pelo seu domínio verificado no Resend futuramente
      to: [email],
      subject: 'Bem-vindo(a) à BitSize! 🍪',
      html: `
        <div style="font-family: sans-serif; color: #2b3036; max-width: 600px; margin: 0 auto;">
          <h2>Inscrição confirmada na BitSize! 🎉</h2>
          <p>Olá!</p>
          <p>Agora você faz parte da comunidade da <strong>BitSize</strong>. Todos os dias você receberá as notícias mais relevantes sobre inteligência artificial, tecnologia e inovação — tudo lido em menos de 5 minutos.</p>
          <p>Fique atento à sua caixa de entrada!</p>
          <hr style="border: 0; border-top: 1px solid #e2ded4; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777;">BitSize - Notícias de tecnologia, todos os dias.</p>
        </div>
      `
    });

    return res.status(201).json({ message: 'Inscrição realizada e e-mail enviado com sucesso!' });

  } catch (error) {
    console.error('Erro no servidor:', error);
    return res.status(500).json({ error: 'Ocorreu um erro interno. Tente novamente mais tarde.' });
  }
});

// Executa app.listen apenas quando rodar localmente fora da Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
}

// Exportação necessária para Serverless Functions na Vercel
export default app;