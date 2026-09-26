# Cofrinho Invista Mais (ESP32 + Blynk + Wokwi)

O cofrinho detecta cada depósito, pesa o conteúdo e manda os dados por dois caminhos:

* **Blynk**: tempo real, dashboard e controle dos atuadores.
* **API Invista+**: histórico no Firestore, usado pela estatística, pelo site React e pelo app.

| Caminho | Protocolo | Para quê |
| --- | --- | --- |
| ESP32 ↔ Blynk Cloud | Blynk sobre TLS | Tempo real, dashboard e comandos dos atuadores |
| ESP32 → API Invista+ | HTTPS (REST) | Depósitos e eventos gravados no Firestore |
| API Invista+ ↔ Blynk Cloud | HTTPS (API de dispositivos) | Estado ao vivo e comandos enviados pela web e pelo app |
| Web e app → API Invista+ | HTTPS (REST) | Histórico, estatística, simulação e controle |

## Componentes e ligações

| Peça | Tipo | Pino ESP32 | Função |
| --- | --- | --- | --- |
| Módulo LDR (saída AO) | sensor analógico | 34 | Detecta moeda/cédula passando pela fenda (sombra) |
| Potenciômetro 10 kΩ | sensor analógico | 35 | Escolhe o valor depositado (R$ 0,05 a R$ 200) |
| Botão | sensor digital | 4 (INPUT_PULLUP) | Clique: depósito manual. Segurar 2 s: relatório por e-mail |
| Reed switch + ímã (ou chave) | sensor digital | 27 (INPUT_PULLUP) | Tampa aberta/fechada |
| Célula de carga 1 kg + HX711 | sensor (ADC 24 bits) | DT 16, SCK 17 | Peso do cofre |
| Servo SG90 | atuador | 18 | Trava da tampa |
| LED RGB catodo comum (+3 resistores de 220 Ω) | atuador | 25, 26, 33 | Cor de status (meta, alerta) |
| Buzzer | atuador | 19 | Bipe de depósito, meta e alarme |
| OLED SSD1306 128×64 I2C | saída | SDA 21, SCL 22 | Saldo, meta e valor selecionado |

O LDR e o potenciômetro ficam no ADC1 (GPIO 32 a 39), porque o ADC2 não funciona com o Wi-Fi ligado.
No cofre físico, coloque um LED iluminando o LDR do outro lado da fenda: a moeda ou cédula corta a luz.

## Blynk

1. Em **Zona do desenvolvedor → Meus modelos**, crie o modelo *Cofrinho Invista Mais* (ESP32, Wi-Fi). O Blynk não aceita "+" em nomes. O modelo do grupo já existe: ID `TMPL2Iy83wKpE`, região NY3 (`ny3.blynk.cloud`).
2. Crie os datastreams (Virtual Pin):

| Pino | Nome | Tipo | Faixa | Quem escreve |
| --- | --- | --- | --- | --- |
| V0 | Saldo (R$) | Double | 0 a 10000 | ESP32 |
| V1 | Último depósito (R$) | Double | 0 a 200 | ESP32 |
| V2 | Peso (g) | Double | 0 a 5000 | ESP32 |
| V3 | Luminosidade (%) | Integer | 0 a 100 | ESP32 |
| V4 | Tampa aberta | Integer | 0 a 1 | ESP32 |
| V5 | Trava | Integer | 0 a 1 | App/web |
| V6 | Cor do LED | Integer | 0 a 4 (desligado, verde, amarelo, vermelho, azul) | App/web |
| V7 | Brilho (%) | Integer | 0 a 100 | App/web |
| V8 | Buzzer | Integer | 0 a 1 | App/web |
| V9 | Meta (R$) | Double | 0 a 10000 | API |

3. Em **Events**, crie `meta_atingida` e `violacao` (tampa aberta com a trava ligada).
Unidades: `R$` (personalizada) em V0, V1 e V9; grama em V2; % em V3. Histórico "Média de 1 minuto" em V0, V1 e V2 para os gráficos.

4. No **Painel de controle** (dashboard web), monte: medidor (V0, 0 a 200), rótulos (V1, V2, V3, V9), gráfico (V0), LED (V4), interruptor (V5), mudança segmentada (V6: Desligado, Verde, Amarelo, Vermelho, Azul), controle deslizante (V7, enviar ao soltar) e botão em modo enviar (V8).
5. Crie o dispositivo a partir do modelo e use o botão *Copiar para a área de transferência* para levar `BLYNK_TEMPLATE_ID`, `BLYNK_TEMPLATE_NAME` e `BLYNK_AUTH_TOKEN` ao `secrets.h`. O token também vai no cadastro do cofrinho no site (ou em Configurações, no painel do cofrinho).

O plano gratuito tem 100 mil mensagens por mês. Por isso a telemetria (peso, luz e tampa) vai a cada 5 minutos, e os depósitos são enviados no momento em que acontecem.

## Cadastro na API

Com o usuário logado (web ou app), chame `POST /api/dispositivos` com `{ "apelido": "...", "blynkToken": "..." }`.
A resposta traz o `id` e a `chaveDispositivo`, que aparece **uma única vez**. Os dois vão para o `secrets.h`.
Se a chave vazar, gere outra com `POST /api/dispositivos/{id}/chave`.

Sem `DISPOSITIVO_ID` e `CHAVE_DISPOSITIVO`, o firmware funciona só com o Blynk.

## Rodar no Wokwi

Projeto pronto: <https://wokwi.com/projects/476253388257385473>

1. Abra o link acima (logado no Wokwi).
2. Na aba `secrets.h`, troque `cole-aqui-o-auth-token-do-dispositivo` pelo token do dispositivo no Blynk.
3. Clique em ▶. **Não salve** com o token dentro: o projeto é público.

Para montar do zero: crie um projeto ESP32, cole `wokwi/diagram.json`, `firmware/cofrinho/cofrinho.ino` (em `sketch.ino`), `wokwi/libraries.txt` e crie as abas `certificados.h` e `secrets.h` (a partir de `secrets.example.h`, acrescentando `#define BLYNK_SEM_TLS`).

Como interagir com a simulação:

* **Potenciômetro**: escolhe o valor mostrado no display.
* **LDR**: baixe o *lux* (de 500 para perto de 1) e volte; isso equivale a uma moeda passando pela fenda.
* **Botão**: um clique também registra o depósito; segurar 2 s envia o relatório por e-mail.
* **Chave deslizante**: abre e fecha a tampa. Com a trava ligada, abrir a tampa dispara o alarme.
* **HX711**: ajuste a carga para simular o peso.

## Rodar no hardware (Arduino IDE)

1. Instale o core **esp32** (Espressif) e as bibliotecas de `wokwi/libraries.txt`.
2. Copie `secrets.example.h` para `secrets.h`. Esse arquivo já está no `.gitignore`.
3. Calibre a balança: `FATOR_BALANCA` é a leitura por grama. Meça um peso conhecido e ajuste o valor.
4. Na primeira vez, ligue com o cofre **vazio**: o firmware zera a balança (tara). Para refazer, ligue segurando o botão.

No Wokwi, a conexão TLS com o Blynk deixa a simulação lenta. Para agilizar a demonstração com um dispositivo de teste, acrescente `#define BLYNK_SEM_TLS` no `secrets.h` (nesse modo o token trafega sem criptografia; não use no hardware real).

## Segurança

* **Conexões cifradas:** o firmware usa TLS com o Blynk e com a API. A API é verificada pelos certificados raiz de `certificados.h`, e não com `setInsecure()`.
* **Envios repetidos:** cada depósito ou evento leva um `id` único. Se a rede falhar, o ESP32 reenvia e a API não duplica o registro.
* **Chave do dispositivo:** a API guarda só o hash da chave. O token do Blynk nunca volta nas respostas da API.
* **Sem internet:** se o Blynk estiver fora do ar, o ESP32 tenta de novo em intervalos crescentes (5 s até 60 s) e continua registrando depósitos, que ficam na fila até a rede voltar.
* **Certificados raiz** em `certificados.h`: GTS Root R1 (SHA-256 `D9:47:43:2A:BD:E7:B7:FA:90:FC:2E:6B:59:10:1B:12:80:E0:E1:C7:E4:E4:0F:A3:C6:88:7F:FF:57:A7:F4:CF`) e ISRG Root X1 (SHA-256 `96:BC:EC:06:26:49:76:F3:74:60:77:9A:CF:28:C5:A7:CF:E8:A3:C0:AA:E1:1A:8F:FC:EE:05:C0:BD:DF:08:C6`). Se a API mudar de provedor, inclua a raiz do novo certificado.
