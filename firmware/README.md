# Terminal financeiro · ESP32, Wokwi e Blynk

Dois sensores de entrada: **potenciômetro analógico** (perfil de risco) e **botão digital** (registro de consultas). Um atuador: **LED**. Botão registra interações; não dispara automaticamente uma compra nem uma consulta de cotação.

| Componente | Pino ESP32 | Ligação |
|---|---|---|
| Potenciômetro | GPIO34 / ADC1 | SIG → 34, VCC → 3V3, GND → GND |
| Botão | GPIO27 | Uma lateral → 27, outra → GND; INPUT_PULLUP |
| LED | GPIO26 | 26 → resistor 220 Ω → ânodo; cátodo → GND |

O `diagram.json` contém essas conexões. O firmware usa ADC de 12 bits (0–4095), interrupção com debounce de 60 ms, coleta a cada 10 segundos, fila de 18 amostras e HTTPS em uma tarefa separada. Até três tentativas preservam a mesma sequência para evitar duplicação no banco. Falhas/overflow são indicados no monitor serial; a fila não sobrevive ao reinício. O horário do histórico é **recebimento no servidor**, não instante preciso de aquisição.

## 1. Blynk

No [Blynk Console](https://blynk.cloud), habilite Developer Zone e crie um template **Invista Terminal**, hardware **ESP32**, conexão **WiFi**. Crie estes datastreams Virtual Pin (Integer):

| Pin | Nome | Mín. | Máx. | Widget sugerido |
|---|---|---:|---:|---|
| V0 | Nível de risco | 0 | 100 | Gauge / Chart |
| V1 | Botão pressionado | 0 | 1 | LED indicador |
| V2 | Comando do LED | 0 | 1 | Switch |
| V3 | Acionamentos no intervalo | 0 | 10000 | Value / Chart |
| V4 | ADC bruto | 0 | 4095 | Value |
| V5 | LED confirmado | 0 | 1 | LED indicador |

Salve o template e crie um **Device from template**. Copie **Template ID**, **Template Name**, **Auth Token** e a região do servidor. Se a conta mostrar, por exemplo, `ny3.blynk.cloud`, use esse endereço tanto no firmware quanto em `BLYNK_SERVER` do backend. V2 é o comando; V5 confirma o GPIO. Em Web Dashboard, adicione o Switch ligado a V2 e os indicadores restantes; no aplicativo Blynk, use os mesmos datastreams.

## 2. Backend e vínculo

Configure `IOT_DEVICE_ID`, `IOT_DEVICE_TOKEN`, `IOT_PAIRING_CODE`, `BLYNK_AUTH_TOKEN` e `BLYNK_SERVER` na Vercel e faça novo deploy. O token Blynk é o mesmo do dispositivo; não é a chave Gemini. Entre na Web ou no app, abra **Meu dispositivo** e use o código de vínculo. Uma conta passa a ser dona do terminal; outras contas não leem seus dados nem controlam seu LED.

## 3. Wokwi

1. Crie um [projeto ESP32](https://wokwi.com/projects/new/esp32).
2. Copie `sketch.ino`, `diagram.json`, `libraries.txt`, `tls-root.h` e `config.example.h` para as abas correspondentes.
3. Crie `config.h` a partir do exemplo e preencha os dados Blynk e `DEVICE_TOKEN` (mesmo `IOT_DEVICE_TOKEN` do servidor). `API_BASE` deve ser o backend público HTTPS, nunca `localhost` nem GitHub Pages.
4. Use `Wokwi-GUEST`, senha vazia, e `DATA_SOURCE "wokwi"`.
5. Inicie. Aguarde WiFi/NTP. Monitor serial deve mostrar HTTP 201; HTTP 409 indica ausência de vínculo ou sequência conflitante; HTTP 401 indica token incorreto.
6. Gire o potenciômetro e pressione o botão. Aguarde até 10 s de coleta + 10 s de atualização da interface. Altere o Switch do LED na Web, no Expo ou no Blynk e confira V5 e o LED no circuito.

**Não publique `config.h` com tokens em projetos Wokwi públicos.** Prefira Wokwi for VS Code com arquivos locais ou projeto privado. O repositório inclui somente exemplos. Nenhum segredo Gemini/Firestore/Vercel deve ir ao ESP32.

## Compilação local / VS Code

```sh
python -m pip install platformio
python -m platformio run -d firmware
```

Sem `config.h`, compila com placeholders e não autentica nos serviços. `wokwi.toml` aponta para os binários do PlatformIO. Para placa real, configure sua rede e `DATA_SOURCE "esp32"`. TLS é validado: Blynk usa as CAs da biblioteca; a API usa GTS Root R1, correspondente ao domínio Vercel verificado. Ao mudar de domínio/certificadora, atualize a CA — não desative sua validação.

Referências: [potenciômetro Wokwi](https://docs.wokwi.com/parts/wokwi-potentiometer), [botão Wokwi](https://docs.wokwi.com/parts/wokwi-pushbutton), [ESP32](https://docs.wokwi.com/guides/esp32), [Virtual Pins](https://docs.blynk.io/en/blynk-library-firmware-api/virtual-pins), [API HTTPS Blynk](https://docs.blynk.io/en/blynk.cloud/device-https-api).
