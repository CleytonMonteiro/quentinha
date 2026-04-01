import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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
const auth = getAuth(app); 
const provider = new GoogleAuthProvider(); 

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
const mesFiltro = document.getElementById('mesFiltro'); // NOVO ELEMENTO

let valorTotalMesAtual = 0;
let mesAnoAtual = "";

const precos = {
    quentinha: 15.00,
    suco_500ml: 3.00,
    suco_1litro: 6.00
};

// --- CONFIGURAÇÃO INICIAL DO FILTRO DE MÊS ---
const hoje = new Date();
const mesAtualStr = String(hoje.getMonth() + 1).padStart(2, '0');
const anoAtualStr = hoje.getFullYear();
// O input type="month" exige o formato AAAA-MM
mesFiltro.value = `${anoAtualStr}-${mesAtualStr}`;

// Sempre que o usuário trocar o mês no seletor, recarrega a tela
mesFiltro.addEventListener('change', () => {
    carregarResumoMes();
});


onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = "none";
        appScreen.style.display = "block";
        dataPedido.valueAsDate = new Date();
        carregarResumoMes(); 
    } else {
        loginScreen.style.display = "block";
        appScreen.style.display = "none";
    }
});

btnLogin.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(error => console.error("Erro no login", error));
});

btnSair.addEventListener('click', () => {
    signOut(auth).catch(error => console.error("Erro ao sair", error));
});


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
        
        // Se eu salvar um pedido para março, mas estiver visualizando março, atualiza a tela
        // Se eu salvar um pedido para o mês atual, muda o filtro para o mês atual e carrega
        mesFiltro.value = `${ano}-${mes}`; 
        carregarResumoMes(); 
    } catch (error) {
        console.error("Erro ao salvar: ", error);
        alert('❌ Erro ao salvar. Verifique se você está logado.');
    }
});

async function carregarResumoMes() {
    // Agora o sistema não pega o "mês atual" direto, ele pega o mês que está selecionado na tela!
    const valorSelecionado = mesFiltro.value; 
    if (!valorSelecionado) return; // Proteção caso o campo fique vazio
    
    // Converte de "AAAA-MM" (do HTML) para "MM-AAAA" (do nosso Firebase)
    const [ano, mes] = valorSelecionado.split('-');
    const filtroMesAno = `${mes}-${ano}`;
    
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
            let pedidosDoMes = [];

            querySnapshot.forEach((doc) => {
                pedidosDoMes.push({ id: doc.id, ...doc.data() });
            });

            pedidosDoMes.sort((a, b) => new Date(b.data) - new Date(a.data));

            pedidosDoMes.forEach((pedido) => {
                somaTotal += pedido.total_dia;

                const li = document.createElement('li');
                li.className = 'item-historico';
                const dataFormatada = pedido.data.split('-').reverse().join('/');
                
                li.innerHTML = `
                    <div class="info-pedido">
                        <span>${dataFormatada} - ${pedido.qtd_quentinhas}x Qnt | ${pedido.tamanho_suco}</span>
                        <strong>R$ ${pedido.total_dia.toFixed(2).replace('.', ',')}</strong>
                    </div>
                    <button class="btn-excluir" data-id="${pedido.id}">🗑️</button>
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
        listaHistorico.innerHTML = '<li class="item-historico vazio" style="color: red;">Erro ao carregar os dados.</li>';
    }
}


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


btnPagarMes.addEventListener('click', async () => {
    if (valorTotalMesAtual === 0) return alert("Não há pedidos para pagar neste mês!");

    const valorFormatado = valorTotalMesAtual.toFixed(2).replace('.', ',');
    if (confirm(`Deseja fechar a fatura de R$ ${valorFormatado} referente a ${mesAnoAtual}?`)) {
        const hoje = new Date();
        const dataPagamento = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

        try {
            await setDoc(doc(db, "pagamentos_mensais", mesAnoAtual), {
                mes_ano: mesAnoAtual,
                valor_total_pago: valorTotalMesAtual,
                data_pagamento: dataPagamento,
                status: "Pago"
            });
            alert("🎉 Pagamento registrado com sucesso!");
            carregarResumoMes(); 
        } catch (error) {
            console.error("Erro ao fechar fatura: ", error);
            alert("Erro ao registrar pagamento.");
        }
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
    });
}