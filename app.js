// Importando Firestore e Authentication via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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
const auth = getAuth(app); // Inicializa a Autenticação
const provider = new GoogleAuthProvider(); // Provedor do Google

// Tabela de Preços Fixos
const precos = {
    quentinha: 18.00,
    suco_500ml: 5.00,
    suco_1litro: 8.00
};

// Elementos da tela
const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('appScreen');
const btnLogin = document.getElementById('btnLogin');
const btnSair = document.getElementById('btnSair');

const formPedido = document.getElementById('formPedido');
const dataPedido = document.getElementById('dataPedido');
const qtdQuentinhasInput = document.getElementById('qtdQuentinhas');
const tamanhoSucoSelect = document.getElementById('tamanhoSuco');
const totalMesText = document.getElementById('totalMes');
const listaHistorico = document.getElementById('listaHistorico');
const btnPagarMes = document.getElementById('btnPagarMes');
const statusMes = document.getElementById('statusMes');

let valorTotalMesAtual = 0;
let mesAnoAtual = "";

// --- SISTEMA DE LOGIN ---

// Escuta as mudanças de estado (logado ou deslogado)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Opcional: Você pode colocar um bloqueio visual aqui também, mas o Firestore já barra outros emails
        console.log("Logado como:", user.email);
        loginScreen.style.display = "none";
        appScreen.style.display = "block";
        dataPedido.valueAsDate = new Date();
        carregarResumoMes(); // Só carrega os dados DEPOIS de logar
    } else {
        loginScreen.style.display = "block";
        appScreen.style.display = "none";
    }
});

// Ação do botão de Login
btnLogin.addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .catch((error) => {
            console.error("Erro ao fazer login:", error);
            alert("Erro ao tentar fazer login com o Google.");
        });
});

// Ação do botão de Sair
btnSair.addEventListener('click', () => {
    signOut(auth).then(() => {
        alert("Você saiu da sua conta.");
    }).catch((error) => {
        console.error("Erro ao sair:", error);
    });
});

// --- LÓGICA DE SALVAR O PEDIDO ---
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
        alert('❌ Erro ao salvar. Verifique se você está logado com o e-mail correto.');
    }
});

// --- LÓGICA DE CARREGAR O RESUMO E CHECAR PAGAMENTO ---
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
            listaHistorico.innerHTML = '<li class="item-historico vazio">Nenhum pedido neste mês.</li>';
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
                        <span>${dataFormatada} - ${pedido.qtd_quentinhas}x Qnt | ${pedido.tamanho_suco}</span>
                        <strong>R$ ${pedido.total_dia.toFixed(2).replace('.', ',')}</strong>
                    </div>
                    <button class="btn-excluir" data-id="${idPedido}">🗑️</button>
                `;
                listaHistorico.appendChild(li);
            });

            valorTotalMesAtual = somaTotal;
            totalMesText.innerText = `R$ ${somaTotal.toFixed(2).replace('.', ',')}`;
        }

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
        listaHistorico.innerHTML = '<li class="item-historico vazio" style="color: red;">Erro de permissão. Você logou com o e-mail autorizado?</li>';
    }
}

// --- LÓGICA DE EXCLUIR O PEDIDO ---
listaHistorico.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-excluir')) {
        const idParaDeletar = e.target.getAttribute('data-id');
        if (confirm("Tem certeza que deseja apagar este pedido?")) {
            try {
                await deleteDoc(doc(db, "pedidos_almoco", idParaDeletar));
                carregarResumoMes(); 
            } catch (error) {
                console.error("Erro ao excluir: ", error);
                alert("Erro ao excluir. Permissão negada.");
            }
        }
    }
});

// --- LÓGICA DE PAGAR A FATURA DO MÊS ---
btnPagarMes.addEventListener('click', async () => {
    if (valorTotalMesAtual === 0) return alert("Não há pedidos para pagar!");

    const valorFormatado = valorTotalMesAtual.toFixed(2).replace('.', ',');
    if (confirm(`Deseja fechar a fatura de R$ ${valorFormatado}?`)) {
        const hoje = new Date();
        const dataPagamento = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

        try {
            await setDoc(doc(db, "pagamentos_mensais", mesAnoAtual), {
                mes_ano: mesAnoAtual,
                valor_total_pago: valorTotalMesAtual,
                data_pagamento: dataPagamento,
                status: "Pago"
            });
            alert("🎉 Pagamento registrado!");
            carregarResumoMes(); 
        } catch (error) {
            console.error("Erro ao fechar fatura: ", error);
            alert("Erro de permissão ao registrar pagamento.");
        }
    }
});

// --- REGISTRO DO SERVICE WORKER (PWA) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
    });
}