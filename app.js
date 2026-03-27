// Importando as funções do Firebase via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Suas configurações do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAfQhKV5vc0O6QKaLL9saeeTSv-5PZJMXg",
  authDomain: "quentinha-71837.firebaseapp.com",
  projectId: "quentinha-71837",
  storageBucket: "quentinha-71837.firebasestorage.app",
  messagingSenderId: "1030117510524",
  appId: "1:1030117510524:web:7ac73d5140d0b6f407e8f9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Tabela de Preços Fixos
const precos = {
    quentinha: 18.00,
    suco_500ml: 5.00,
    suco_1litro: 8.00
};

// Mapeando os elementos da tela
const formPedido = document.getElementById('formPedido');
const dataPedido = document.getElementById('dataPedido');
const qtdQuentinhasInput = document.getElementById('qtdQuentinhas');
const tamanhoSucoSelect = document.getElementById('tamanhoSuco');
const totalMesText = document.getElementById('totalMes');
const listaHistorico = document.getElementById('listaHistorico');
const btnPagarMes = document.getElementById('btnPagarMes');
const statusMes = document.getElementById('statusMes');

dataPedido.valueAsDate = new Date();

// Variáveis globais
let valorTotalMesAtual = 0;
let mesAnoAtual = "";

// --- 1. LÓGICA DE SALVAR O PEDIDO ---
formPedido.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = dataPedido.value;
    const qtd = parseInt(qtdQuentinhasInput.value);
    const tipoSuco = tamanhoSucoSelect.value;

    const [ano, mes, dia] = data.split('-');
    const mesAno = `${mes}-${ano}`;

    let valorSuco = 0;
    if (tipoSuco === '500ml') valorSuco = precos.suco_500ml;
    if (tipoSuco === '1 Litro') valorSuco = precos.suco_1litro;

    const totalDia = (precos.quentinha * qtd) + valorSuco;

    const novoPedido = {
        data: data,
        mes_ano: mesAno,
        qtd_quentinhas: qtd,
        tamanho_suco: tipoSuco,
        total_dia: totalDia
    };

    try {
        await addDoc(collection(db, "pedidos_almoco"), novoPedido);
        alert('✅ Pedido salvo com sucesso!');
        
        qtdQuentinhasInput.value = 1;
        tamanhoSucoSelect.value = "Nenhum";
        dataPedido.valueAsDate = new Date();
        carregarResumoMes(); 

    } catch (error) {
        console.error("Erro ao salvar: ", error);
        alert('❌ Erro ao salvar o pedido.');
    }
});

// --- 2. LÓGICA DE CARREGAR O RESUMO E CHECAR PAGAMENTO ---
async function carregarResumoMes() {
    const hoje = new Date();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const anoAtual = hoje.getFullYear();
    const filtroMesAno = `${mesAtual}-${anoAtual}`;
    
    mesAnoAtual = filtroMesAno;

    listaHistorico.innerHTML = '<li class="item-historico vazio">Buscando dados...</li>';

    try {
        const q = query(collection(db, "pedidos_almoco"), where("mes_ano", "==", filtroMesAno));
        const querySnapshot = await getDocs(q);
        
        let somaTotal = 0;
        listaHistorico.innerHTML = ''; 

        if (querySnapshot.empty) {
            listaHistorico.innerHTML = '<li class="item-historico vazio">Nenhum pedido neste mês ainda.</li>';
            totalMesText.innerText = "R$ 0,00";
            valorTotalMesAtual = 0;
        } else {
            querySnapshot.forEach((doc) => {
                const pedido = doc.data();
                const idPedido = doc.id; 
                somaTotal += pedido.total_dia;

                const li = document.createElement('li');
                li.className = 'item-historico';
                const dataFormatada = pedido.data.split('-').reverse().join('/');
                
                li.innerHTML = `
                    <div class="info-pedido">
                        <span>${dataFormatada} - ${pedido.qtd_quentinhas}x Quentinha(s) | Suco: ${pedido.tamanho_suco}</span>
                        <strong>R$ ${pedido.total_dia.toFixed(2).replace('.', ',')}</strong>
                    </div>
                    <button class="btn-excluir" data-id="${idPedido}">🗑️</button>
                `;
                listaHistorico.appendChild(li);
            });

            valorTotalMesAtual = somaTotal;
            totalMesText.innerText = `R$ ${somaTotal.toFixed(2).replace('.', ',')}`;
        }

        // CHECAGEM DE PAGAMENTO DO MÊS
        const pagamentoRef = doc(db, "pagamentos_mensais", filtroMesAno);
        const pagamentoSnap = await getDoc(pagamentoRef);

        if (pagamentoSnap.exists()) {
            const dadosPagamento = pagamentoSnap.data();
            const dataPagFormatada = dadosPagamento.data_pagamento.split('-').reverse().join('/');
            
            statusMes.textContent = `Pago em ${dataPagFormatada}`;
            statusMes.className = "status pago";
            btnPagarMes.style.display = "none"; 
        } else {
            statusMes.textContent = "Fatura em Aberto";
            statusMes.className = "status em-aberto";
            btnPagarMes.style.display = "block"; 
        }

    } catch (error) {
        console.error("Erro ao buscar dados: ", error);
        listaHistorico.innerHTML = '<li class="item-historico vazio" style="color: red;">Erro ao carregar.</li>';
    }
}

// --- 3. LÓGICA DE EXCLUIR O PEDIDO ---
listaHistorico.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-excluir')) {
        const idParaDeletar = e.target.getAttribute('data-id');
        const confirmacao = confirm("Tem certeza que deseja apagar este pedido?");
        
        if (confirmacao) {
            try {
                await deleteDoc(doc(db, "pedidos_almoco", idParaDeletar));
                carregarResumoMes(); 
            } catch (error) {
                console.error("Erro ao excluir: ", error);
                alert("Erro ao tentar excluir o pedido.");
            }
        }
    }
});

// --- 4. LÓGICA DE PAGAR A FATURA DO MÊS ---
btnPagarMes.addEventListener('click', async () => {
    if (valorTotalMesAtual === 0) {
        alert("Não há pedidos para pagar neste mês ainda!");
        return;
    }

    const valorFormatado = valorTotalMesAtual.toFixed(2).replace('.', ',');
    const confirmacao = confirm(`Deseja fechar a fatura e registrar o pagamento de R$ ${valorFormatado}?`);
    
    if (confirmacao) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        const dataPagamento = `${ano}-${mes}-${dia}`;

        try {
            await setDoc(doc(db, "pagamentos_mensais", mesAnoAtual), {
                mes_ano: mesAnoAtual,
                valor_total_pago: valorTotalMesAtual,
                data_pagamento: dataPagamento,
                status: "Pago"
            });
            
            alert("🎉 Pagamento do mês registrado com sucesso!");
            carregarResumoMes(); 
        } catch (error) {
            console.error("Erro ao fechar fatura: ", error);
            alert("Erro ao registrar o pagamento.");
        }
    }
});

// Inicializa a aplicação
carregarResumoMes();

// --- 5. REGISTRO DO SERVICE WORKER (Para o app ser instalável - PWA) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service worker registrado com sucesso!', reg.scope))
            .catch(err => console.error('Erro ao registrar service worker', err));
    });
}