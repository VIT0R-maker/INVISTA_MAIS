import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { cores } from './src/componentes/UI';
import { restaurar, sair } from './src/sessao';
import Cofrinhos from './src/telas/Cofrinhos';
import Entrar from './src/telas/Entrar';
import Estatisticas from './src/telas/Estatisticas';
import Painel from './src/telas/Painel';
import Simulacao from './src/telas/Simulacao';

const ABAS = [
  { id: 'painel', rotulo: 'Painel', Tela: Painel },
  { id: 'estatisticas', rotulo: 'Estatísticas', Tela: Estatisticas },
  { id: 'simulacao', rotulo: 'Simulação', Tela: Simulacao },
];

export default function App() {
  const [usuario, setUsuario] = useState(undefined);
  const [dispositivo, setDispositivo] = useState(null);
  const [aba, setAba] = useState('painel');

  useEffect(() => {
    restaurar().then(setUsuario);
  }, []);

  async function encerrar() {
    await sair();
    setDispositivo(null);
    setUsuario(null);
  }

  let conteudo;
  if (usuario === undefined) {
    conteudo = <ActivityIndicator style={{ flex: 1 }} color={cores.primaria} />;
  } else if (!usuario) {
    conteudo = <Entrar aoEntrar={setUsuario} />;
  } else if (!dispositivo) {
    conteudo = <Cofrinhos aoEscolher={d => { setDispositivo(d); setAba('painel'); }} />;
  } else {
    const { Tela } = ABAS.find(a => a.id === aba);
    conteudo = <Tela key={`${dispositivo.id}-${aba}`} dispositivo={dispositivo} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        {usuario && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: cores.borda }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: cores.primaria }}>Cofrinho Invista+</Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {dispositivo && (
                <Pressable onPress={() => setDispositivo(null)} accessibilityRole="button">
                  <Text style={{ color: cores.primaria, fontWeight: '600' }}>Cofrinhos</Text>
                </Pressable>
              )}
              <Pressable onPress={encerrar} accessibilityRole="button">
                <Text style={{ color: cores.suave, fontWeight: '600' }}>Sair</Text>
              </Pressable>
            </View>
          </View>
        )}
        <View style={{ flex: 1 }}>{conteudo}</View>
        {usuario && dispositivo && (
          <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderColor: cores.borda }}>
            {ABAS.map(a => (
              <Pressable key={a.id} onPress={() => setAba(a.id)} style={{ flex: 1, paddingVertical: 14 }} accessibilityRole="tab">
                <Text style={{ textAlign: 'center', fontWeight: '700', color: aba === a.id ? cores.primaria : cores.suave }}>{a.rotulo}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
