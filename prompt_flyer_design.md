# Prompt — Flyer QR code ATM Connect (design clean/moderno)

> Cola este prompt numa IA com geração de HTML/design forte para obteres o novo flyer.

---

**Papel:** És um designer de flyers impressos de alta qualidade.

**Objectivo:** Cria um **flyer portrait (A6, proporção 3:4)** para afixar junto a caixas multibanco (ATMs) em Angola. Contém um QR code que leva a **https://dinheiroemmao.com**, onde as pessoas confirmam em tempo real se o ATM tem dinheiro.

**Mensagem (tom "poupa a ida"):**
- Headline: **"Poupa a ida ao ATM."**
- Subtítulo: "Confirma em tempo real se este ATM tem dinheiro — antes de saíres de casa."
- 3 micro-passos: "Escaneia o QR" → "Vê se tem dinheiro" → "Vem só quando compensar"
- Rodapé: **dinheiroemmao.com** + ícone de telefone + **+244 933 986 318**

**Marca:** nome **ATM Connect** com um pin/marker de localização + nota de dinheiro como logo (símbolo simples).

**Cores exactas:**
- Azul primário `#2F7BF0`, escuro `#1C5FD1`, mais escuro `#184FA9`
- Azul claro `#DCECFE`, muito claro `#F0F6FF`
- Verde `#4CAF6B` (dinheiro/sucesso), verde escuro `#399256`
- Texto `#111827`, secundário `#6B7280`, borda `#ECEEF2`
- **Gradiente de marca disponível:** `linear-gradient(135deg, #2F7BF0 0%, #4CAF6B 100%)` — usa-o apenas como acento subtil (ex.: faixa/linha fina no rodapé ou canto), nunca como fundo pesado a ocupar metade do flyer.

**Direcção (clean/moderno):** fundo **branco dominante** com muito espaço em branco — **NÃO** usar faixa de gradiente pesada a ocupar metade do flyer. Headline grande e bold preta, hierarquia clara (headline → subtítulo → steps → rodapé). Um único acento de marca (linha/gradiente fino ou bloco de rodapé azul escuro). **QR grande e centralizado (~45-55% da largura), zona de silêncio branca** para leitura fiável. Sem decoração desnecessária; leitura em 2 segundos; contraste alto que funcione também impresso a preto-e-branco.

**QR code:** real e escaneável para `https://dinheiroemmao.com` — usa `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=8&color=111827&data=https%3A%2F%2Fdinheiroemmao.com` ou a lib `qrcode` via CDN (canvas/SVG). QR `#111827` sobre branco.

**Entrega:** um único ficheiro HTML autocontido (CSS inline) mostrando o flyer como papel centrado em fundo neutro, ~360px de largura (proporção real de A6), que funcione aberto directamente no browser, sem instalar nada.

**Antes de terminar, revê:** espaçamentos consistentes, hierarquia tipográfica, alinhamento central, e se a headline + QR se lêem à distância de 1-2 m.