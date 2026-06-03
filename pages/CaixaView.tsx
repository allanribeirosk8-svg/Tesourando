import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  Smile, 
  Package, 
  Scissors, 
  Home, 
  ShoppingBag, 
  Wrench, 
  CreditCard, 
  CircleDollarSign,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  Users,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  UserPlus,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart, 
  Pie
} from 'recharts';
import { AnimatePresence, motion } from 'motion/react';
import { useStore } from '../context/Store';
import { LancamentoModal } from '../components/LancamentoModal';
import { formatCurrency, getAvatarColor, getInitials } from '../utils/helpers';
import { Transaction } from '../types';
import { useSwipe } from '../hooks/useSwipe';

export const CaixaView: React.FC = () => {
  const { 
    transactions, 
    appointments, 
    customers, 
    services, 
    weeklySchedule, 
    loadTransactions, 
    deleteTransaction,
    isDarkMode
  } = useStore();

  const [activeTab, setActiveTab] = useState<'resumo'|'extrato'|'clientes'|'servicos'|'agenda'>('resumo');
  const [periodo, setPeriodo] = useState<'dia'|'semana'|'mes'|'ano'>('mes');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showLancamento, setShowLancamento] = useState<'income' | 'expense' | false>(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [showAllInativos, setShowAllInativos] = useState(false);
  const [entradasExpanded, setEntradasExpanded] = useState(false);
  const [filtroExtrato, setFiltroExtrato] = useState<'todas' | 'entradas' | 'saidas'>('todas');

  // Determine start/end of the current period
  const dateRange = useMemo(() => {
    const d = new Date(selectedDate);
    const start = new Date(d);
    const end = new Date(d);

    if (periodo === 'dia') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (periodo === 'semana') {
      const day = d.getDay();
      start.setDate(d.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (periodo === 'mes') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    } else if (periodo === 'ano') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
    }

    console.log('[DATE_RANGE] periodo:', periodo);
    console.log('[DATE_RANGE] selectedDate.toString():', selectedDate.toString());
    console.log('[DATE_RANGE] start calculado:', start.toString());
    console.log('[DATE_RANGE] end calculado:', end.toString());
    console.log('[DATE_RANGE] start.toISOString():', start.toISOString());
    console.log('[DATE_RANGE] end.toISOString():', end.toISOString());
    
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return { start: fmt(start), end: fmt(end) };
  }, [periodo, selectedDate]);

  useEffect(() => {
    loadTransactions(dateRange.start, dateRange.end);
  }, [dateRange.start, dateRange.end]);

  const handlePrev = () => {
    const d = new Date(selectedDate);
    if (periodo === 'dia') d.setDate(d.getDate() - 1);
    if (periodo === 'semana') d.setDate(d.getDate() - 7);
    if (periodo === 'mes') d.setMonth(d.getMonth() - 1);
    if (periodo === 'ano') d.setFullYear(d.getFullYear() - 1);
    setSelectedDate(d);
  };

  const handleNext = () => {
    const d = new Date(selectedDate);
    if (periodo === 'dia') d.setDate(d.getDate() + 1);
    if (periodo === 'semana') d.setDate(d.getDate() + 7);
    if (periodo === 'mes') d.setMonth(d.getMonth() + 1);
    if (periodo === 'ano') d.setFullYear(d.getFullYear() + 1);
    setSelectedDate(d);
  };

  const txNoPeriodo = useMemo(() => {
    return transactions.filter(t => {
      const txDate = (t.date || '').split('T')[0];
      return txDate >= dateRange.start && txDate <= dateRange.end;
    });
  }, [transactions, dateRange]);

  // Filter local state appointments for current period
  const periodAppointments = useMemo(() => {
    return appointments.filter(a => {
      const aptDate = a.date.split('T')[0];
      return aptDate >= dateRange.start && aptDate <= dateRange.end;
    });
  }, [appointments, dateRange]);

  const completedApts = periodAppointments.filter(a => a.status === 'completed');
  const noShowApts = periodAppointments.filter(a => a.status === 'no-show');
  
  // KPI Calculations
  const aptIncome = completedApts.reduce((sum, a) => sum + (a.price || 0), 0);
  // Entradas manuais: todas as income que NÃO têm linkedAppointmentId preenchido
  const manualIncome = txNoPeriodo
    .filter(t => t.type === 'income' && !(t as any).linkedAppointmentId)
    .reduce((sum, t) => sum + t.amount, 0);
  const faturamento = aptIncome + manualIncome;
  const atendimentos = completedApts.length;
  const faltas = noShowApts.length;
  const ticketMedio = atendimentos > 0 ? aptIncome / atendimentos : 0;
  const noShowRate = (atendimentos + faltas) > 0 ? (faltas / (atendimentos + faltas)) * 100 : 0;
  const expenseTotal = txNoPeriodo.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const lucroEstimado = faturamento - expenseTotal;

  const prevRange = useMemo(() => {
    const hoje = new Date();
    const sStart = new Date(dateRange.start);
    const sEnd = new Date(dateRange.end);

    // Detecta se o período selecionado ainda está em andamento
    const periodoEmAndamento =
      hoje >= sStart && hoje <= sEnd;

    // Calcula quantos dias já se passaram no período atual
    const diasDecorridos = periodoEmAndamento
      ? Math.floor((hoje.getTime() - sStart.getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((sEnd.getTime() - sStart.getTime()) / (1000 * 60 * 60 * 24));

    // Duração total do período atual
    const duracaoTotal = Math.floor((sEnd.getTime() - sStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Início do período anterior (mesmo tamanho)
    const prevStart = new Date(sStart);
    prevStart.setDate(prevStart.getDate() - duracaoTotal);

    // Fim do período anterior: proporcional se em andamento, completo se encerrado
    const prevEnd = new Date(prevStart);
    prevEnd.setDate(prevEnd.getDate() + diasDecorridos);

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    return {
      start: fmt(prevStart),
      end: fmt(prevEnd),
      periodoEmAndamento,
      diasDecorridos,
      duracaoTotal,
    };
  }, [dateRange]);

  const renderResumo = () => {
    const prevCompleted = appointments.filter(a => a.status === 'completed' && a.date >= prevRange.start && a.date <= prevRange.end);
    const prevFaturamento = prevCompleted.reduce((s, a) => s + (a.price || 0), 0);
    const faturamentoDiff = prevFaturamento > 0 ? ((faturamento - prevFaturamento) / prevFaturamento * 100) : null;
    const prevTicket = prevCompleted.length > 0 ? prevFaturamento / prevCompleted.length : 0;
    const ticketDiff = prevTicket > 0 ? ((ticketMedio - prevTicket) / prevTicket * 100) : null;
    const prevAtend = prevCompleted.length;
    const atendDiff = prevAtend > 0 ? ((atendimentos - prevAtend) / prevAtend * 100) : null;

    // Entrada avulsa do período anterior (para comparação)
    const prevManualIncome = transactions
      .filter(t =>
        t.type === 'income' &&
        !(t as any).linkedAppointmentId &&
        t.date >= prevRange.start &&
        t.date <= prevRange.end
      )
      .reduce((s, t) => s + t.amount, 0);
    const manualIncomeDiff = prevManualIncome > 0
      ? ((manualIncome - prevManualIncome) / prevManualIncome * 100)
      : null;

    // Despesa avulsa do período anterior (para comparação)
    const prevExpenseTotal = transactions
      .filter(t =>
        t.type === 'expense' &&
        t.date >= prevRange.start &&
        t.date <= prevRange.end
      )
      .reduce((s, t) => s + t.amount, 0);
    const expenseDiff = prevExpenseTotal > 0
      ? ((expenseTotal - prevExpenseTotal) / prevExpenseTotal * 100)
      : null;

    // Lucro do período anterior (para comparação)
    const prevLucro = prevFaturamento - prevExpenseTotal;
    const lucroDiff = prevLucro !== 0
      ? ((lucroEstimado - prevLucro) / Math.abs(prevLucro) * 100)
      : null;

    // Faltas: valor perdido e comparação
    const valorPerdido = faltas * ticketMedio;
    const prevFaltas = appointments.filter(
      a => a.status === 'no-show' &&
      a.date >= prevRange.start &&
      a.date <= prevRange.end
    ).length;
    const faltasDiff = prevFaltas > 0
      ? ((faltas - prevFaltas) / prevFaltas * 100)
      : null;

    const chartData = (() => {
      if (periodo === 'dia') {
        return Array.from({ length: 13 }, (_, i) => {
          const h = i + 8;
          return { label: `${h}h`, value: completedApts.filter(a => parseInt(a.time) === h).length };
        });
      }
      if (periodo === 'semana') {
        const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return dias.map((d, i) => ({
          label: d,
          value: completedApts.filter(a => {
            const [y, m, day] = a.date.split('-').map(Number);
            return new Date(y, m - 1, day).getDay() === i;
          }).length,
        }));
      }
      if (periodo === 'mes') {
        return Array.from({ length: 5 }, (_, i) => ({
          label: `S${i + 1}`,
          value: completedApts.filter(a => {
            const day = parseInt(a.date.split('-')[2]);
            return Math.floor((day - 1) / 7) === i;
          }).length,
        }));
      }
      const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return meses.map((m, i) => ({
        label: m,
        value: completedApts.filter(a => parseInt(a.date.split('-')[1]) - 1 === i).length,
      }));
    })();
    const maxChart = Math.max(...chartData.map(d => d.value), 1);

    const Chip = ({
      titulo,
      valor,
      diff,
      sub,
      sub2,
      icon: Icon,
      diffInvert = false,
    }: {
      titulo: string;
      valor: string;
      diff?: number | null;
      sub?: string;
      sub2?: string;
      icon?: React.ElementType;
      diffInvert?: boolean;
    }) => (
      <div className="rounded-[1.5rem] bg-surface border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)] p-4 flex flex-col gap-1 relative overflow-hidden">
        {Icon && (
          <Icon size={48} className="absolute bottom-2 right-3 text-white/[0.06] pointer-events-none" />
        )}
        <span className="text-[10px] font-bold uppercase text-title truncate">{titulo}</span>
        <span className="text-base font-black text-white leading-tight break-words min-w-0">{valor}</span>
        {diff !== undefined && diff !== null && (
          <span className={`text-[10px] font-bold flex items-center gap-0.5 ${
            diffInvert
              ? (diff <= 0 ? 'text-[#34D399]' : 'text-[#F87171]')
              : (diff >= 0 ? 'text-[#34D399]' : 'text-[#F87171]')
          }`}>
            {diff >= 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}% vs anterior
          </span>
        )}
        {sub && <span className="text-[10px] text-title">{sub}</span>}
        {sub2 && <span className="text-[10px] text-title">{sub2}</span>}
      </div>
    );

    const totalAtendimentosMes = atendimentos;
    const totalFaltas = faltas;
    const variacaoAtendimentos = atendDiff !== null ? atendDiff.toFixed(1) : 0;
    const valorPerdidoFaltas = valorPerdido;
    const totalGorjetas = txNoPeriodo.filter(t => t.type === 'income' && t.category === 'tip' && !(t as any).linkedAppointmentId).reduce((s,t) => s+t.amount, 0);
    const totalProdutos = txNoPeriodo.filter(t => t.type === 'income' && t.category === 'product' && !(t as any).linkedAppointmentId).reduce((s,t) => s+t.amount, 0);
    const totalAtendimentosValor = aptIncome + txNoPeriodo.filter(t => t.type === 'income' && t.category === 'walk_in' && !(t as any).linkedAppointmentId).reduce((s,t) => s+t.amount, 0);
    const totalOutros = txNoPeriodo.filter(t => t.type === 'income' && !['tip', 'product', 'walk_in'].includes(t.category) && !(t as any).linkedAppointmentId).reduce((s,t) => s+t.amount, 0);

    // Texto de contexto da comparação proporcional
    const ctxComparacao = (() => {
      if (!prevRange.periodoEmAndamento) return null; // período encerrado, sem aviso necessário

      if (periodo === 'dia') return null; // dia é sempre completo

      if (periodo === 'semana') {
        const diasSemana = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
        const diaAtual = diasSemana[new Date().getDay()];
        return `até ${diaAtual} (mesmo recorte das 2 semanas)`;
      }

      if (periodo === 'mes') {
        const dia = new Date().getDate();
        const mesAnteriorNome = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
          'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][
            new Date(prevRange.start).getMonth()
          ];
        return `comparando os primeiros ${dia} dias com os primeiros ${dia} dias de ${mesAnteriorNome}`;
      }

      if (periodo === 'ano') {
        const hoje = new Date();
        return `comparando até ${hoje.getDate()}/${hoje.getMonth()+1} dos dois anos`;
      }

      return null;
    })();

    // Linha de rodapé proporcional para adicionar ao corpo dos insights quando necessário
    const rodapeProporcional = ctxComparacao
      ? `\n📐 Comparação proporcional: ${ctxComparacao}.`
      : '';

    const insights: { emoji: string; titulo: string; corpo: string; cor: 'red' | 'green' | 'yellow' | 'blue' }[] = [];

    const periodoNome = periodo === 'mes' ? 'mês' : periodo === 'semana' ? 'semana' : periodo === 'ano' ? 'ano' : 'dia';
    const prevMesNome = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
      'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][
        new Date(prevRange.start).getMonth()
      ];

    // 1. Alta taxa de faltas
    if (noShowRate > 20) {
      insights.push({
        emoji: '🚨', cor: 'red',
        titulo: 'Atenção: muitas faltas',
        corpo: `${noShowRate.toFixed(0)}% dos agendamentos viraram falta este ${periodoNome}. Você perdeu ${formatCurrency(valorPerdido)} em receita. Considere cobrar sinal ou confirmar 1h antes.`,
      });
    }

    // 2. Queda de faturamento
    if (faturamentoDiff !== null && faturamentoDiff < -15) {
      insights.push({
        emoji: '📉', cor: 'red',
        titulo: 'Faturamento caindo',
        corpo: `Receita ${faturamentoDiff.toFixed(1)}% menor que o período anterior (era ${formatCurrency(prevFaturamento)}).${rodapeProporcional} Verifique se houve menos dias trabalhados ou perda de clientes.`,
      });
    }

    // 3. Ticket médio crescendo
    if (ticketDiff !== null && ticketDiff > 10 && atendimentos >= 5) {
      insights.push({
        emoji: '📈', cor: 'green',
        titulo: 'Ticket médio em alta',
        corpo: `Seu corte médio subiu ${ticketDiff.toFixed(1)}% em relação ao período anterior${ctxComparacao ? ` (${ctxComparacao})` : ''}. De ${formatCurrency(prevTicket)} para ${formatCurrency(ticketMedio)}. Seus clientes estão pagando mais — resultado de posicionamento ou serviços premium.`,
      });
    }

    // 4. Volume alto, lucro comprimido
    if (atendimentos > 15 && lucroEstimado < faturamento * 0.5) {
      insights.push({
        emoji: '⚡', cor: 'yellow',
        titulo: 'Volume alto, lucro comprimido',
        corpo: `Você fez ${atendimentos} atendimentos mas o lucro ficou em ${((lucroEstimado / faturamento) * 100).toFixed(0)}% da receita. Suas despesas estão pesando — revise os custos fixos.`,
      });
    }

    // 5. Melhor período registrado
    if (faturamentoDiff !== null && faturamentoDiff > 50 && atendimentos > 10) {
      insights.push({
        emoji: '🎯', cor: 'green',
        titulo: `Ótimo ${periodoNome}${prevRange.periodoEmAndamento ? ' até agora' : ''}`,
        corpo: prevRange.periodoEmAndamento
          ? `Nos primeiros ${prevRange.diasDecorridos + 1} dias: ${formatCurrency(faturamento)} com ${atendimentos} atendimentos e ticket médio de ${formatCurrency(ticketMedio)}. ${faturamentoDiff.toFixed(0)}% acima dos primeiros ${prevRange.diasDecorridos + 1} dias de ${prevMesNome}. Anote o que está fazendo diferente.`
          : `${formatCurrency(faturamento)} com ${atendimentos} atendimentos e ticket médio de ${formatCurrency(ticketMedio)}. ${faturamentoDiff.toFixed(0)}% acima de ${prevMesNome} completo. Anote o que fez diferente desta vez.`,
      });
    }

    // 6. Faltas com impacto financeiro relevante
    if (faltas > 0 && valorPerdido > faturamento * 0.1) {
      insights.push({
        emoji: '💸', cor: 'yellow',
        titulo: 'Faltas custando caro',
        corpo: `${faltas} falta${faltas > 1 ? 's representaram' : ' representou'} ${formatCurrency(valorPerdido)} — ${((valorPerdido / faturamento) * 100).toFixed(0)}% da sua receita do período jogada fora.`,
      });
    }

    // 7. Despesas crescendo mais rápido que receita
    if (expenseDiff !== null && faturamentoDiff !== null && expenseDiff > faturamentoDiff + 20) {
      insights.push({
        emoji: '💰', cor: 'yellow',
        titulo: 'Despesas crescendo mais que a receita',
        corpo: `Suas saídas subiram ${expenseDiff.toFixed(1)}% enquanto a receita cresceu ${faturamentoDiff.toFixed(1)}%${ctxComparacao ? ` (${ctxComparacao})` : ''}. Isso comprime sua margem — fique de olho nos custos.`,
      });
    }

    // 8. Crescimento consistente
    if (faturamentoDiff !== null && faturamentoDiff > 10 && faturamentoDiff <= 50 && atendDiff !== null && atendDiff > 0) {
      insights.push({
        emoji: '🌱', cor: 'blue',
        titulo: 'Crescimento saudável',
        corpo: `Faturamento +${faturamentoDiff.toFixed(1)}% e ${atendimentos} atendimentos (+${atendDiff.toFixed(0)}% vs anterior)${ctxComparacao ? `, ${ctxComparacao}` : ''}. Crescimento consistente é mais valioso que um pico isolado.`,
      });
    }

    const historicData = (() => {
      if (periodo === 'mes') {
        const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return Array.from({ length: 12 }, (_, i) => {
          const ref = new Date(selectedDate);
          ref.setDate(15);
          ref.setMonth(ref.getMonth() - (11 - i));
          const ano = ref.getFullYear();
          const mes = ref.getMonth(); // 0-based
          const count = appointments.filter(a => {
            const dateParts = a.date.split('-');
            return a.status === 'completed' && parseInt(dateParts[0]) === ano && parseInt(dateParts[1]) - 1 === mes;
          }).length;
          const receita = appointments
            .filter(a => {
              const dateParts = a.date.split('-');
              return a.status === 'completed' && parseInt(dateParts[0]) === ano && parseInt(dateParts[1]) - 1 === mes;
            })
            .reduce((s, a) => s + (a.price || 0), 0);
          const isSelected = ano === selectedDate.getFullYear() && mes === selectedDate.getMonth();
          return { label: MESES_ABREV[mes], count, receita, isSelected };
        });
      } else if (periodo === 'semana') {
        return Array.from({ length: 8 }, (_, i) => {
          const ref = new Date(dateRange.start); 
          ref.setDate(ref.getDate() - (7 - i) * 7);
          const wStart = ref.toISOString().split('T')[0];
          const wEndDate = new Date(ref);
          wEndDate.setDate(ref.getDate() + 6);
          const wEnd = wEndDate.toISOString().split('T')[0];
          const count = appointments.filter(a =>
            a.status === 'completed' && a.date >= wStart && a.date <= wEnd
          ).length;
          const receita = appointments
            .filter(a => a.status === 'completed' && a.date >= wStart && a.date <= wEnd)
            .reduce((s, a) => s + (a.price || 0), 0);
          const isSelected = i === 7; 
          const label = `${String(ref.getDate()).padStart(2,'0')}/${String(ref.getMonth()+1).padStart(2,'0')}`;
          return { label, count, receita, isSelected };
        });
      } else if (periodo === 'ano') {
        const anos = [...new Set(appointments.map(a => parseInt(a.date.split('-')[0])))].sort();
        if (anos.length < 2) return []; 
        return anos.map(ano => {
          const count = appointments.filter(a =>
            a.status === 'completed' && parseInt(a.date.split('-')[0]) === ano
          ).length;
          const receita = appointments
            .filter(a => a.status === 'completed' && parseInt(a.date.split('-')[0]) === ano)
            .reduce((s, a) => s + (a.price || 0), 0);
          return { label: String(ano), count, receita, isSelected: ano === selectedDate.getFullYear() };
        });
      } else { 
        const hoje = new Date();
        const noventa = new Date(hoje);
        noventa.setDate(hoje.getDate() - 90);
        const noveStr = noventa.toISOString().split('T')[0];
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        const contagemDOW = [0, 0, 0, 0, 0, 0, 0];
        const totalDias = [0, 0, 0, 0, 0, 0, 0];

        const d = new Date(noventa);
        while (d <= hoje) {
          totalDias[d.getDay()]++;
          d.setDate(d.getDate() + 1);
        }

        appointments
          .filter(a => a.status === 'completed' && a.date >= noveStr)
          .forEach(a => {
            const dow = new Date(a.date + 'T12:00:00').getDay();
            contagemDOW[dow]++;
          });

        const currentDOW = selectedDate.getDay();

        return diasSemana.map((label, i) => ({
          label,
          count: totalDias[i] > 0 ? parseFloat((contagemDOW[i] / totalDias[i] * 7).toFixed(1)) : 0,
          receita: 0,
          isSelected: i === currentDOW,
        }));
      }
    })();
    const tituloHistorico = periodo === 'mes' ? 'Últimos 12 Meses' : periodo === 'semana' ? 'Últimas 8 Semanas' : periodo === 'ano' ? 'Evolução Anual' : 'Média por Dia da Semana (90 dias)';

    return (
      <div className="space-y-4">
        {/* Card Resumo de Caixa */}
        <div className="bg-[#F5F5F8] rounded-[1.5rem] p-4 shadow-[0_3px_12px_rgba(0,0,0,0.10)] border border-black/[0.06]">
          {/* Linha Entradas */}
          <div 
            onClick={() => setEntradasExpanded(!entradasExpanded)}
            className="flex items-center justify-between py-3 border-b border-black/[0.06] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100/80 flex items-center justify-center">
                <ArrowDown className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-[#1E1B4B] font-medium text-sm flex items-center gap-2">
                Entradas
                <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${entradasExpanded ? 'rotate-180' : ''}`} />
              </span>
            </div>
            <span className="text-green-600 font-semibold text-sm">{formatCurrency(faturamento)}</span>
          </div>

          {/* Breakdown expansível */}
          {entradasExpanded && (
            <div className="pl-11 pb-2 pt-2 space-y-1">
              <div className="flex justify-between text-sm text-[#6B7280]">
                <span>✂️ Atendimentos</span>
                <span className="text-green-600">{formatCurrency(totalAtendimentosValor)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#6B7280]">
                <span>🤝 Gorjeta</span>
                <span className="text-green-600">{formatCurrency(totalGorjetas)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#6B7280]">
                <span>🛍️ Produto</span>
                <span className="text-green-600">{formatCurrency(totalProdutos)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#6B7280]">
                <span>📦 Outros</span>
                <span className="text-green-600">{formatCurrency(totalOutros)}</span>
              </div>
            </div>
          )}

          {/* Linha Saídas */}
          <div className="flex items-center justify-between py-3 border-b border-black/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100/80 flex items-center justify-center">
                <ArrowUp className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-[#1E1B4B] font-medium text-sm">Saídas</span>
            </div>
            <span className="text-red-500 font-semibold text-sm">{formatCurrency(expenseTotal)}</span>
          </div>
          
          {/* Saldo */}
          <div className="flex items-center justify-between pt-3">
            <span className="text-[#1E1B4B] font-semibold text-base">Saldo {periodo === 'mes' ? 'do mês' : 'do período'}</span>
            <div className="flex flex-col items-end gap-1">
              <span className={`font-black text-lg ${lucroEstimado >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(lucroEstimado)}</span>
              {lucroDiff !== null && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${lucroDiff >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {lucroDiff >= 0 ? '↑' : '↓'} {lucroDiff >= 0 ? '+' : ''}{lucroDiff.toFixed(1)}% vs {periodo === 'mes' ? 'mês anterior' : 'período anterior'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card Atendimentos */}
        <div className="bg-[#F5F5F8] rounded-[1.5rem] p-4 shadow-[0_3px_12px_rgba(0,0,0,0.10)] border border-black/[0.06]">
          {/* Linha 1 — Atendimentos + badge inline */}
          <div className="flex items-center justify-between py-2 border-b border-black/[0.06]">
            <span className="text-[#1E1B4B] font-medium">✂️ Atendimentos</span>
            <div className="flex items-center gap-2">
              <span className="text-[#1E1B4B] font-bold">{totalAtendimentosMes}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${Number(variacaoAtendimentos) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {Number(variacaoAtendimentos) >= 0 ? '↑' : '↓'} {Number(variacaoAtendimentos) >= 0 ? '+' : ''}{variacaoAtendimentos}%
              </span>
            </div>
          </div>
          {/* Linha 2 — Ticket médio */}
          <div className="flex items-center justify-between py-2 border-b border-black/[0.06]">
            <span className="text-[#1E1B4B] font-medium">💰 Ticket médio</span>
            <span className="text-green-600 font-semibold">{formatCurrency(ticketMedio)}</span>
          </div>
          {/* Linha 3 — Faltas */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[#1E1B4B] font-medium">⚠️ Faltas</span>
            <div className="flex items-center gap-2">
              <span className="text-[#1E1B4B] font-bold">{totalFaltas}</span>
              {(ticketMedio > 0 && totalFaltas > 0) && (
                <span className="bg-red-100 text-red-600 font-black text-[10px] px-2 py-0.5 rounded-full">
                  - {formatCurrency(valorPerdidoFaltas)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Insights Inteligentes */}
        {insights.length > 0 && (
          <div className="space-y-2">
            {insights.slice(0, 3).map((insight, idx) => {
              const cores = {
                red:    'bg-red-500/10 border-red-500/20 text-[#F87171]',
                green:  'bg-green-500/10 border-green-500/20 text-[#34D399]',
                yellow: 'bg-[#FBBF24]/10 border-[#FBBF24]/20 text-[#FBBF24]',
                blue:   'bg-blue-500/10 border-blue-500/20 text-blue-400',
              };
              return (
                <div key={idx} className={`border rounded-2xl p-3 text-xs font-bold ${cores[insight.cor]}`}>
                  <p className="font-black mb-1">{insight.emoji} {insight.titulo}</p>
                  <p className="font-medium opacity-90 leading-relaxed whitespace-pre-line">{insight.corpo}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Gráfico */}
        <div className="bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <p className="text-[10px] font-bold uppercase text-title mb-3">Atendimentos no Período</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8A98A8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#8A98A8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
                formatter={(value: number) => [value, 'Atendimentos']}
                labelFormatter={(label) => `Período: ${label}`}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill="#F99417" fillOpacity={d.value === maxChart ? 1 : 0.3} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico Histórico */}
        {historicData.length > 0 && (
          <div className="bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <p className="text-[10px] font-bold uppercase text-title mb-1">{tituloHistorico}</p>
            <p className="text-[9px] text-title/60 mb-3">
              {periodo === 'dia'
                ? 'Atendimentos médios por dia da semana'
                : 'Atendimentos concluídos'}
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={historicData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: periodo === 'mes' ? 8 : 10, fill: '#8A98A8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#8A98A8' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={periodo === 'dia'}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
                  formatter={(value: number, name: string, props: any) => {
                    const item = props.payload;
                    if (periodo === 'dia') return [`${value} atend./semana (média)`, ''];
                    return [
                      `${value} atend.${item.receita > 0 ? ` · ${formatCurrency(item.receita)}` : ''}`,
                      ''
                    ];
                  }}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {historicData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.isSelected ? '#F99417' : '#F99417'}
                      fillOpacity={d.isSelected ? 1 : 0.25}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legenda do destaque */}
            <p className="text-[9px] text-title/50 mt-2 text-center">
              {periodo === 'mes' && '● Laranja = mês atual'}
              {periodo === 'semana' && '● Laranja = semana atual'}
              {periodo === 'ano' && '● Laranja = ano atual'}
              {periodo === 'dia' && `● Laranja = ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][selectedDate.getDay()]} (dia selecionado)`}
            </p>
          </div>
        )}
      </div>
    );
  };

  const getIcon = (category: string) => {
    switch(category) {
      case 'tip': return <Smile size={18} />;
      case 'product': return <Package size={18} />;
      case 'walk_in': return <Scissors size={18} />;
      case 'rent': return <Home size={18} />;
      case 'supply': return <ShoppingBag size={18} />;
      case 'equipment': return <Wrench size={18} />;
      case 'fee': return <CreditCard size={18} />;
      default: return <CircleDollarSign size={18} />;
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      tip: 'Gorjeta', product: 'Produto', walk_in: 'Serviço Avulso', rent: 'Aluguel',
      supply: 'Insumos', equipment: 'Equipamento', fee: 'Taxa/Maquininha', other: 'Outro'
    };
    return labels[cat] || cat;
  };

  const renderExtrato = () => {
    const extratoItems = (() => {
      // Atendimentos concluídos como entradas
      const fromApts = completedApts.map(a => ({
        id: `apt-${a.id}`,
        type: 'income' as const,
        category: 'appointment' as string,
        description: `${a.service} — ${a.clientName}`,
        amount: a.price || 0,
        date: a.date.split('T')[0],
        isAppointment: true,
        time: a.time,
      }));
      // Transações manuais automáticas geradas por atendimentos
      const manualTx = txNoPeriodo
        .filter(t => !(t as any).linkedAppointmentId)
        .map(t => ({ ...t, date: (t.date || '').split('T')[0], isAppointment: false }));
      
      // Unir e ordenar por data desc, depois por hora desc
      return [...fromApts, ...manualTx].sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return ((b.time as string) || '00:00').localeCompare((a.time as string) || '00:00');
      });
    })();

    const totalEntradas = extratoItems.filter(i => i.type === 'income').reduce((s, i) => s + i.amount, 0);
    const totalSaidas = extratoItems.filter(i => i.type === 'expense').reduce((s, i) => s + i.amount, 0);
    const resultado = totalEntradas - totalSaidas;

    const transacoesFiltradas = extratoItems.filter(t => {
      if (filtroExtrato === 'entradas') return t.type === 'income';
      if (filtroExtrato === 'saidas')   return t.type === 'expense';
      return true;
    });

    return (
      <div className="space-y-4 pb-20">
        {/* Filtro de abas — fixo, não scrolla com a lista */}
        <div className="sticky top-0 z-10 pb-3 -mx-4 px-4 pt-2 -mt-2 bg-[#1E1B4B]">
          <div className="flex bg-primary/40 rounded-2xl p-1 gap-1">
            {([
              { key: 'todas',    label: 'Todas'    },
              { key: 'entradas', label: 'Entradas' },
              { key: 'saidas',   label: 'Saídas'   },
            ] as const).map(({ key, label }) => {

              const isActive = filtroExtrato === key;

              // Cor do fundo ativo por aba
              const activeBg =
                key === 'todas'    ? 'bg-secondary' :   // cor principal
                key === 'entradas' ? 'bg-[#34D399]' :   // verde — cor do valor de entrada
                                     'bg-[#F87171]';    // vermelho — cor do valor de saída

              // Cor do texto ativo
              const activeText =
                key === 'todas'    ? 'text-white' :
                key === 'entradas' ? 'text-white' :
                                     'text-white';

              return (
                <button
                  key={key}
                  onClick={() => setFiltroExtrato(key)}
                  className={`
                    flex-1 py-2 rounded-xl text-xs font-black transition-all duration-200
                    ${isActive
                      ? `${activeBg} ${activeText} shadow-[0_2px_8px_rgba(0,0,0,0.3)]`
                      : 'text-title hover:text-white'
                    }
                  `}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {transacoesFiltradas.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-title text-sm font-bold">
              {filtroExtrato === 'entradas'
                ? 'Nenhuma entrada neste período'
                : filtroExtrato === 'saidas'
                ? 'Nenhuma saída neste período'
                : 'Nenhuma transação neste período'}
            </p>
          </div>
        ) : (
          transacoesFiltradas.map(item => {
            let icon, iconBg;
            if (item.isAppointment) {
              icon = <Scissors size={18} />;
              iconBg = 'bg-secondary/20 text-secondary';
            } else if (item.category === 'tip') {
              icon = <Smile size={18} />;
              iconBg = 'bg-[#FBBF24]/20 text-[#FBBF24]';
            } else if (item.type === 'expense') {
              icon = getIcon(item.category);
              iconBg = 'bg-[#F87171]/20 text-[#F87171]';
            } else {
              icon = <CircleDollarSign size={18} />;
              iconBg = 'bg-[#34D399]/20 text-[#34D399]';
            }

            const Content = (
              <div className="bg-surface p-4 flex items-center gap-3 z-10 w-full">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {item.description || getCategoryLabel(item.category)}
                  </p>
                  <p className="text-[11px] text-title font-medium">
                    {item.date.split('-').reverse().join('/')}
                    {item.isAppointment && item.time ? ` · ${item.time}` : ` · ${getCategoryLabel(item.category)}`}
                  </p>
                </div>
                <div className={`text-sm font-black flex-shrink-0 ${item.type === 'income' ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
                  {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
                </div>
              </div>
            );

            return (
              <div key={item.id} className="relative overflow-hidden rounded-2xl bg-surface border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)] group">
                {!item.isAppointment && (
                  <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center -z-10">
                    <Trash2 size={20} className="text-white" />
                  </div>
                )}
                {!item.isAppointment ? (
                  <motion.div 
                    id={`tx-${item.id}`}
                    drag="x"
                    dragConstraints={{ left: -80, right: 0 }}
                    onDragEnd={(e, info) => {
                      if (info.offset.x < -40) {
                        deleteTransaction(item.id);
                      }
                    }}
                  >
                    {Content}
                  </motion.div>
                ) : (
                  <div>{Content}</div>
                )}
              </div>
            );
          })
        )}

        {/* Sticky footer */}
        <div className="fixed bottom-[64px] left-0 right-0 bg-surface/90 backdrop-blur-[12px] border-t border-white/10 p-3 flex justify-between items-center text-[10px] font-bold z-20">
          <div className="text-center">
            <p className="text-title uppercase mb-1">Entradas</p>
            <p className="text-[#34D399]">{formatCurrency(totalEntradas)}</p>
          </div>
          <div className="text-center">
            <p className="text-title uppercase mb-1">Saídas</p>
            <p className="text-[#F87171]">{formatCurrency(totalSaidas)}</p>
          </div>
          <div className="text-center">
            <p className="text-title uppercase mb-1">Resultado</p>
            <p className={resultado >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'}>{formatCurrency(resultado)}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderClientes = () => {
    // Clientes ativos: tiveram ao menos 1 completed nos últimos 60 dias (ignora filtro de período)
    const hoje = new Date();
    const sessenta = new Date(hoje);
    sessenta.setDate(hoje.getDate() - 60);
    const sessentaStr = sessenta.toISOString().split('T')[0];
    const clientesAtivos = new Set(
      appointments
        .filter(a => a.status === 'completed' && a.date >= sessentaStr)
        .map(a => a.phone)
    ).size;

    // Clientes únicos no período
    const clientesPeriodo = completedApts.reduce<Record<string, { nome: string; visitas: number; total: number }>>((acc, a) => {
      if (!acc[a.phone]) acc[a.phone] = { nome: a.clientName, visitas: 0, total: 0 };
      acc[a.phone].visitas += 1;
      acc[a.phone].total += a.price || 0;
      return acc;
    }, {});
    const clientesArr = Object.entries(clientesPeriodo).map(([phone, v]: [string, { nome: string; visitas: number; total: number }]) => ({ phone, ...v }));
    const returnRate = clientesArr.length > 0
      ? (clientesArr.filter(c => c.visitas >= 2).length / clientesArr.length * 100)
      : 0;

    const topFreq = [...clientesArr].sort((a, b) => b.visitas - a.visitas).slice(0, 5);
    const topValor = [...clientesArr].sort((a, b) => b.total - a.total).slice(0, 5);

    // Clientes inativos: último completed há mais de 30 dias
    const trintaStr = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })();
    const ultimoCorte: Record<string, string> = {};
    appointments.filter(a => a.status === 'completed').forEach(a => {
      if (!ultimoCorte[a.phone] || a.date > ultimoCorte[a.phone]) ultimoCorte[a.phone] = a.date;
    });
    const inativos = Object.entries(ultimoCorte)
      .filter(([, date]) => date < trintaStr)
      .map(([phone, date]) => ({
        phone,
        nome: appointments.find(a => a.phone === phone)?.clientName || phone,
        diasAtraso: Math.floor((hoje.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => b.diasAtraso - a.diasAtraso);

    const inativosVisiveis = showAllInativos ? inativos : inativos.slice(0, 5);

    const noShowClientes = clientesArr
      .map(c => ({ ...c, faltas: appointments.filter(a => a.phone === c.phone && a.status === 'no-show' && a.date >= dateRange.start && a.date <= dateRange.end).length }))
      .filter(c => c.faltas > 0)
      .sort((a, b) => b.faltas - a.faltas)
      .slice(0, 3);

    // Clientes atendidos únicos no período (phones distintos)
    const clientesAtendidos = clientesArr.length;

    // Novos clientes: primeiro atendimento de todos os tempos cai dentro do dateRange
    const novosClientes = clientesArr.filter(c => {
      const todosApts = appointments
        .filter(a => a.phone === c.phone && a.status === 'completed')
        .map(a => a.date)
        .sort();
      return todosApts.length > 0 && todosApts[0] >= dateRange.start && todosApts[0] <= dateRange.end;
    }).length;

    // Inativos em risco: sem visita há mais de 60 dias
    const inativosEmRisco = inativos.filter(c => c.diasAtraso > 60).length;

    const ClienteItem: React.FC<{ nome: string; sub: string; valor: string }> = ({ nome, sub, valor }) => (
      <div className="flex items-center gap-3 py-2">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${getAvatarColor(nome)}`}>
          {getInitials(nome)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{nome}</p>
          <p className="text-[11px] text-title">{sub}</p>
        </div>
        <span className="text-sm font-black text-secondary">{valor}</span>
      </div>
    );

    return (
      <div className="space-y-4 pb-6">
        {/* ── BLOCO 1: Visão Geral (sempre fixo, independente do período) ── */}
        <div>
          <p className="text-[10px] font-bold uppercase text-title mb-2 tracking-[0.1em]">
            Visão Geral
          </p>
          <div className="flex gap-3">
            {/* Clientes Ativos */}
            <div className="flex-1 bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)] relative overflow-hidden">
              <Users size={48} className="absolute bottom-2 right-3 text-white/[0.06] pointer-events-none" />
              <p className="text-[10px] font-bold uppercase text-title mb-1">Clientes Ativos</p>
              <p className="text-2xl font-black text-white">{clientesAtivos}</p>
              <p className="text-[10px] text-title">últimos 60 dias</p>
            </div>
            {/* Inativos em risco */}
            <div className="flex-1 bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)] relative overflow-hidden">
              <AlertTriangle size={48} className="absolute bottom-2 right-3 text-white/[0.06] pointer-events-none" />
              <p className="text-[10px] font-bold uppercase text-title mb-1">Em Risco</p>
              <p className={`text-2xl font-black ${inativosEmRisco > 0 ? 'text-[#F87171]' : 'text-white'}`}>
                {inativosEmRisco}
              </p>
              <p className="text-[10px] text-title">sem visita +60 dias</p>
            </div>
          </div>
          {inativos.length > 0 && (
            <div className="mt-3 bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
              <p className="text-[10px] font-bold uppercase text-title mb-3">Clientes Inativos</p>
              {inativosVisiveis.map(c => (
                <div key={c.phone} className="flex items-center gap-3 py-2">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${getAvatarColor(c.nome)}`}>
                    {getInitials(c.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{c.nome}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                        c.diasAtraso > 60
                          ? 'bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/30'
                          : 'bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30'
                      }`}>
                        {c.diasAtraso > 60 ? '⚠ Risco alto' : '· Atenção'}
                      </span>
                      <span className="text-[10px] text-title">{c.diasAtraso} dias sem visita</span>
                    </div>
                  </div>
                </div>
              ))}
              {inativos.length > 5 && (
                <button
                  onClick={() => setShowAllInativos(!showAllInativos)}
                  className="mt-2 text-xs text-secondary font-bold w-full text-center"
                >
                  {showAllInativos ? 'Ver menos' : `Ver todos (${inativos.length})`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── BLOCO 2: No período selecionado (responde ao filtro) ── */}
        <div>
          <p className="text-[10px] font-bold uppercase text-title mb-2 tracking-[0.1em]">
            No Período
          </p>
          <div className="flex gap-3">
            {/* Clientes Atendidos */}
            <div className="flex-1 bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)] relative overflow-hidden">
              <Scissors size={48} className="absolute bottom-2 right-3 text-white/[0.06] pointer-events-none" />
              <p className="text-[10px] font-bold uppercase text-title mb-1">Atendidos</p>
              <p className="text-2xl font-black text-white">{clientesAtendidos}</p>
              <p className="text-[10px] text-title">clientes únicos</p>
            </div>
            {/* Novos Clientes */}
            <div className="flex-1 bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)] relative overflow-hidden">
              <UserPlus size={48} className="absolute bottom-2 right-3 text-white/[0.06] pointer-events-none" />
              <p className="text-[10px] font-bold uppercase text-title mb-1">Novos</p>
              <p className={`text-2xl font-black ${novosClientes > 0 ? 'text-secondary' : 'text-white'}`}>
                {novosClientes}
              </p>
              <p className="text-[10px] text-title">primeira visita</p>
            </div>
          </div>

          {/* Taxa de retorno — logo abaixo, largura total */}
          <div className="mt-3 bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <div className="flex justify-between items-baseline">
              <div>
                <p className="text-[10px] font-bold uppercase text-title mb-1">Taxa de Retorno</p>
                <p className="text-[10px] text-title">clientes com ≥ 2 visitas no período</p>
              </div>
              <p className="text-2xl font-black text-white">{returnRate.toFixed(0)}%</p>
            </div>
            {/* Barra de progresso */}
            <div className="w-full bg-primary/40 rounded-full h-2 mt-3">
              <div
                className="bg-secondary h-2 rounded-full transition-all"
                style={{ width: `${Math.min(returnRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top frequência */}
        {periodo !== 'dia' && topFreq.length > 0 && (
          <div className="bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <p className="text-[10px] font-bold uppercase text-title mb-3">Mais Frequentes</p>
            {topFreq.map(c => <ClienteItem key={c.phone} nome={c.nome} sub={`${c.visitas} visita${c.visitas > 1 ? 's' : ''}`} valor={formatCurrency(c.total)} />)}
          </div>
        )}

        {/* Top valor */}
        {periodo !== 'dia' && topValor.length > 0 && (
          <div className="bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <p className="text-[10px] font-bold uppercase text-title mb-3">Maior Valor</p>
            {topValor.map(c => <ClienteItem key={c.phone} nome={c.nome} sub={`${c.visitas} visita${c.visitas > 1 ? 's' : ''}`} valor={formatCurrency(c.total)} />)}
          </div>
        )}

        {/* Atendimentos do Dia */}
        {periodo === 'dia' && clientesAtendidos > 0 && (
          <div className="bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <p className="text-[10px] font-bold uppercase text-title mb-2">Atendimentos do Dia</p>
            {completedApts.map(a => (
              <div key={a.id} className="flex items-center gap-3 py-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${getAvatarColor(a.clientName)}`}>
                  {getInitials(a.clientName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{a.clientName}</p>
                  <p className="text-[11px] text-title">{a.service} · {a.time}</p>
                </div>
                <span className="text-sm font-black text-secondary">{formatCurrency(a.price || 0)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Faltantes */}
        {noShowClientes.length > 0 && (
          <div className="bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <p className="text-[10px] font-bold uppercase text-title mb-3">Maiores Faltantes</p>
            {noShowClientes.map(c => (
              <ClienteItem
                key={c.phone}
                nome={c.nome}
                sub={`${c.faltas} falta${c.faltas > 1 ? 's' : ''} no período`}
                valor={ticketMedio > 0 ? `${c.faltas}x · ${formatCurrency(c.faltas * ticketMedio)}` : `${c.faltas}x`}
              />
            ))}
          </div>
        )}

        {clientesArr.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-title">
            <Users size={48} className="mb-4 opacity-50" />
            <p className="text-sm font-medium">Nenhum cliente neste período.</p>
          </div>
        )}
      </div>
    );
  };

  const renderServicos = () => {
    const servicosMap = completedApts.reduce<Record<string, { total: number; count: number }>>((acc, a) => {
      if (!acc[a.service]) acc[a.service] = { total: 0, count: 0 };
      acc[a.service].total += a.price || 0;
      acc[a.service].count += 1;
      return acc;
    }, {});

    const servicosArr = Object.entries(servicosMap)
      .map(([name, v]: [string, { total: number; count: number }]) => ({ name, ...v, ticket: v.count > 0 ? v.total / v.count : 0 }))
      .sort((a, b) => b.total - a.total);

    const maxTotal = servicosArr[0]?.total || 1; // fix logic here

    const PIE_COLORS = ['#F99417', '#34D399', '#FBBF24', '#F87171', '#A78BFA'];
    const totalApts = completedApts.length;
    const pieData = (() => {
      const top = servicosArr.slice(0, 5);
      const outros = servicosArr.slice(5).reduce((s, v) => s + v.count, 0);
      const data = top.map(s => ({ name: s.name, value: s.count }));
      if (outros > 0) data.push({ name: 'Outros', value: outros });
      return data;
    })();

    if (servicosArr.length === 0) return (
      <div className="flex flex-col items-center justify-center p-8 text-title">
        <Scissors size={48} className="mb-4 opacity-50" />
        <p className="text-sm font-medium">Nenhum serviço realizado neste período.</p>
      </div>
    );

    return (
      <div className="space-y-4 pb-6">
        {/* Ranking */}
        <div className="bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <p className="text-[10px] font-bold uppercase text-title mb-3">Ranking por Faturamento</p>
          <div className="space-y-3">
            {servicosArr.map((s, i) => (
              <div key={s.name}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-bold text-white truncate max-w-[55%]">{s.name}</span>
                  <span className="text-xs font-black text-secondary">{formatCurrency(s.total)}</span>
                </div>
                <div className="w-full bg-primary/40 rounded-full h-1.5">
                  <div className="bg-secondary h-1.5 rounded-full" style={{ width: `${(s.total / maxTotal) * 100}%` }} />
                </div>
                <p className="text-[10px] text-title mt-0.5">{s.count} atend. · ticket {formatCurrency(s.ticket)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pizza */}
        {pieData.length > 0 && (
          <div className="bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <p className="text-[10px] font-bold uppercase text-title mb-3">Distribuição por Atendimentos</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${((v / totalApts) * 100).toFixed(1)}%`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-3">
              {pieData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-white flex-1 truncate">{s.name}</span>
                  <span className="text-title font-bold">{((s.value / totalApts) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAgenda = () => {
    // Ocupação do período
    const totalSlots = (() => {
      let count = 0;
      const d = new Date(dateRange.start);
      // to offset timezone issues we add 12 hours here
      d.setHours(12);
      const end = new Date(dateRange.end);
      end.setHours(12);
      while (d <= end) {
        const dow = d.getDay();
        const cfg = weeklySchedule[dow];
        if (cfg?.isOpen && cfg.start && cfg.end) {
          const [sh, sm] = cfg.start.split(':').map(Number);
          const [eh, em] = cfg.end.split(':').map(Number);
          count += Math.floor(((eh * 60 + em) - (sh * 60 + sm)) / 30);
        }
        d.setDate(d.getDate() + 1);
      }
      return count;
    })();
    const usedSlots = completedApts.length + noShowApts.length;
    const ocupacao = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0;
    const ocupacaoColor = ocupacao >= 70 ? '#34D399' : ocupacao >= 40 ? '#FBBF24' : '#F87171';

    // Dias mais movimentados (filtrado)
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const porDia = [0, 0, 0, 0, 0, 0, 0];
    completedApts.forEach(a => {
      const [y, m, d] = a.date.split('-').map(Number);
      porDia[new Date(y, m - 1, d).getDay()]++;
    });
    const maxDia = Math.max(...porDia, 1);

    // Horários de pico (filtrado)
    const picoManha = [0, 0, 0, 0, 0, 0, 0];
    const picoTarde = [0, 0, 0, 0, 0, 0, 0];
    const picoNoite = [0, 0, 0, 0, 0, 0, 0];
    completedApts.forEach(a => {
      const [y, m, d] = a.date.split('-').map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      const h = parseInt(a.time?.split(':') || '0');
      if (h >= 8 && h < 12) picoManha[dow]++;
      else if (h >= 12 && h < 17) picoTarde[dow]++;
      else if (h >= 17 && h < 21) picoNoite[dow]++;
    });
    const maxPico = Math.max(...picoManha, ...picoTarde, ...picoNoite, 1);

    // Para período === 'semana'
    const porDiaSemana = diasSemana.map((label, dow) => {
      const count = completedApts.filter(a => {
        const [y, m, d] = a.date.split('-').map(Number);
        return new Date(y, m - 1, d).getDay() === dow;
      }).length;
      // data real do dia
      const diaReal = new Date(dateRange.start);
      diaReal.setHours(12);
      while (diaReal.getDay() !== dow) diaReal.setDate(diaReal.getDate() + 1);
      const dentroDoRange =
        diaReal.toISOString().split('T')[0] >= dateRange.start &&
        diaReal.toISOString().split('T')[0] <= dateRange.end;
      return { label, dow, count, dentroDoRange };
    });
    const maxDiaSemana = Math.max(...porDiaSemana.map(d => d.count), 1);

    // Para período === 'dia'
    const porHora = Array.from({ length: 13 }, (_, i) => {
      const h = i + 8;
      const count = completedApts.filter(a => {
        const hora = parseInt(a.time?.split(':') || '0');
        return hora === h;
      }).length;
      return { label: `${h}h`, h, count };
    });
    const maxHora = Math.max(...porHora.map(d => d.count), 1);
    const horaPico = porHora.reduce((max, cur) => cur.count > max.count ? cur : max, porHora[0]);

    return (
      <div className="space-y-4 pb-6">
        {/* Ocupação */}
        <div className="bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <div className="flex justify-between items-baseline mb-2">
            <p className="text-[10px] font-bold uppercase text-title">Taxa de Ocupação</p>
            <span className="text-2xl font-black" style={{ color: ocupacaoColor }}>{ocupacao}%</span>
          </div>
          <div className="w-full bg-primary/40 rounded-full h-3">
            <div className="h-3 rounded-full transition-all" style={{ width: `${ocupacao}%`, backgroundColor: ocupacaoColor }} />
          </div>
          <p className="text-[11px] text-title mt-1">{usedSlots} de {totalSlots} slots utilizados</p>
        </div>

        {/* Impacto faltas */}
        {faltas > 0 && (
          <div className="bg-red-500/10 border border-red-500/20  rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase text-[#F87171] mb-1">Impacto das Faltas</p>
            <p className="text-sm text-[#F87171] font-bold">
              {faltas} falta{faltas > 1 ? 's' : ''} × {formatCurrency(ticketMedio)} = <span className="text-lg font-black">{formatCurrency(faltas * ticketMedio)}</span> perdidos
            </p>
          </div>
        )}

        {(periodo === 'mes' || periodo === 'ano') && (
          <>
            {/* Dias movimentados */}
            <div className="bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
              <p className="text-[10px] font-bold uppercase text-title mb-3">Dias Mais Movimentados</p>
              <div className="space-y-2">
                {diasSemana.map((d, i) => (
                  <div key={d} className="flex items-center gap-2">
                    <span className="text-xs text-title w-8">{d}</span>
                    <div className="flex-1 bg-primary/40 rounded-full h-2">
                      <div className="bg-secondary h-2 rounded-full" style={{ width: `${(porDia[i] / maxDia) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-white w-6 text-right">{porDia[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Horários de pico */}
            <div className="bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
              <p className="text-[10px] font-bold uppercase text-title mb-3">Horários de Pico</p>
              <div className="grid grid-cols-8 gap-1 text-center">
                <div className="text-[9px] text-title"></div>
                {diasSemana.map(d => <div key={d} className="text-[9px] text-title font-bold">{d}</div>)}
                {[{ label: 'Manhã', data: picoManha }, { label: 'Tarde', data: picoTarde }, { label: 'Noite', data: picoNoite }].map(row => (
                  <React.Fragment key={row.label}>
                    <div className="text-[9px] text-title flex items-center">{row.label}</div>
                    {row.data.map((v, i) => (
                      <div key={i} className="h-6 rounded" style={{ backgroundColor: `rgba(40,152,216,${v / maxPico})` }} />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </>
        )}

        {periodo === 'semana' && (
          <>
            {/* Movimento da Semana */}
            <div className="bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
              <p className="text-[10px] font-bold uppercase text-title mb-3">
                Movimento da Semana
              </p>
              <div className="space-y-2">
                {porDiaSemana.map(({ label, count, dentroDoRange }) => (
                  <div key={label} className={`flex items-center gap-2 ${!dentroDoRange ? 'opacity-30' : ''}`}>
                    <span className="text-xs text-title w-8">{label}</span>
                    <div className="flex-1 bg-primary/40 rounded-full h-2">
                      <div
                        className="bg-secondary h-2 rounded-full transition-all"
                        style={{ width: `${(count / maxDiaSemana) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-white w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Turnos da Semana */}
            <div className="bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
              <p className="text-[10px] font-bold uppercase text-title mb-1">Turnos da Semana</p>
              <p className="text-[9px] text-title/50 mb-3">Concentração de atendimentos por turno</p>
              <div className="grid grid-cols-8 gap-1 text-center">
                <div className="text-[9px] text-title"></div>
                {diasSemana.map(d => <div key={d} className="text-[9px] text-title font-bold">{d}</div>)}
                {[{ label: 'Manhã', data: picoManha }, { label: 'Tarde', data: picoTarde }, { label: 'Noite', data: picoNoite }].map(row => (
                  <React.Fragment key={row.label}>
                    <div className="text-[9px] text-title flex items-center">{row.label}</div>
                    {row.data.map((v, i) => (
                      <div key={i} className="h-6 rounded" style={{ backgroundColor: `rgba(40,152,216,${v / maxPico})` }} />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </>
        )}

        {periodo === 'dia' && (
          <div className="bg-surface rounded-2xl p-4 border border-white/8 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <div className="flex justify-between items-baseline mb-3">
              <p className="text-[10px] font-bold uppercase text-title">Linha do Dia</p>
              {horaPico && horaPico.count > 0 && (
                <span className="text-[10px] font-bold text-secondary">
                  Pico: {horaPico.label}
                </span>
              )}
            </div>

            {completedApts.length === 0 ? (
              <p className="text-[11px] text-title text-center py-4">
                Nenhum atendimento neste dia
              </p>
            ) : (
              <div className="space-y-1.5">
                {porHora.map(({ label, count }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[10px] text-title w-7">{label}</span>
                    <div className="flex-1 bg-primary/40 rounded-full h-2">
                      <div
                        className="bg-secondary h-2 rounded-full transition-all"
                        style={{ width: `${(count / maxHora) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-white w-4 text-right">
                      {count > 0 ? count : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const getPeriodLabel = () => {
    const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    if (periodo === 'dia') {
      return `${selectedDate.getDate()} DE ${MESES[selectedDate.getMonth()].toUpperCase()} - ${selectedDate.getFullYear()}`;
    }
    if (periodo === 'semana') {
      const inicio = new Date(dateRange.start);
      // to offset timezone issues we add 12 hours here
      inicio.setHours(12);
      const fim = new Date(dateRange.end);
      fim.setHours(12);
      return `${inicio.getDate()} A ${fim.getDate()} DE ${MESES[fim.getMonth()].toUpperCase()} - ${fim.getFullYear()}`;
    }
    if (periodo === 'mes') {
      return `${MESES[selectedDate.getMonth()].toUpperCase()} - ${selectedDate.getFullYear()}`;
    }
    return `${selectedDate.getFullYear()}`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#1E1B4B]">
      {/* Period Selector & Navigator */}
      <div className="px-4 py-4 sticky top-0 bg-[#1E1B4B] z-30">
        <div className="flex gap-2 items-center">
          {/* Dropdown de período */}
          <div className="relative">
            <select
              value={periodo}
              onChange={e => {
                const newPeriodo = e.target.value as 'dia' | 'semana' | 'mes' | 'ano';
                setPeriodo(newPeriodo);

                const d = new Date(selectedDate);
                if (newPeriodo === 'semana') {
                  const day = d.getDay();
                  d.setDate(d.getDate() - day);
                } else if (newPeriodo === 'mes') {
                  d.setDate(1);
                } else if (newPeriodo === 'ano') {
                  d.setMonth(0, 1);
                }
                setSelectedDate(new Date(d));
              }}
              className="appearance-none bg-surface border border-title/30 rounded-2xl pl-3 pr-7 h-10 text-[10px] font-black uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(0,0,0,0.3)] focus:outline-none cursor-pointer text-center"
            >
              <option value="dia">Dia</option>
              <option value="semana">Semana</option>
              <option value="mes">Mês</option>
              <option value="ano">Ano</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-title pointer-events-none" />
          </div>

          {/* Navegador de data */}
          <div className="flex-1 flex items-center justify-between bg-surface rounded-2xl px-2 h-10 shadow-[0_4px_16px_rgba(0,0,0,0.3)] border border-title/30 flex-shrink min-w-0">
            <button onClick={handlePrev} className="p-1 text-title hover:text-secondary flex-shrink-0">
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] font-bold text-white uppercase min-w-0 truncate text-center">{getPeriodLabel()}</span>
            <button onClick={handleNext} className="p-1 text-title hover:text-secondary flex-shrink-0">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3 sticky top-[64px] bg-[#1E1B4B] z-30">
        <div className="flex gap-2 w-full">
          {(['resumo','extrato','clientes','servicos','agenda'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
                activeTab === t ? 'bg-secondary text-white shadow-md' : 'bg-surface text-title'
              }`}
            >
              {t === 'resumo' ? 'Resumo'
                : t === 'extrato' ? 'Extrato'
                : t === 'clientes' ? 'Clientes'
                : t === 'servicos' ? 'Serviços'
                : 'Agenda'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 w-full max-w-full overflow-x-hidden pt-2 pb-[160px] min-h-full bg-[#1E1B4B]">
        {activeTab === 'resumo' && renderResumo()}
        {activeTab === 'extrato' && renderExtrato()}
        {activeTab === 'clientes' && renderClientes()}
        {activeTab === 'servicos' && renderServicos()}
        {activeTab === 'agenda' && renderAgenda()}
      </div>

      {(activeTab === 'resumo' || activeTab === 'extrato') && (
        <div className={`fixed right-4 z-30 flex flex-col-reverse items-end gap-3 ${
          activeTab === 'resumo' ? 'bottom-[80px]' : 'bottom-[140px]'
        }`}>
          <AnimatePresence>
            {fabOpen && (
              <>
                {/* Botão Saída */}
                <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:16}}
                  transition={{delay:0.05}} className="flex items-center gap-2">
                  <span className="bg-white dark:bg-[#162032] text-xs font-bold px-2 py-1 rounded-full shadow text-[#1A2332] dark:text-[#E2EAF4]">Saída</span>
                  <button onClick={()=>{setFabOpen(false);setShowLancamento('expense')}}
                    className="w-12 h-12 rounded-full bg-[#F87171] text-white flex items-center justify-center shadow-lg opacity-80">
                    <ArrowDownCircle size={22}/>
                  </button>
                </motion.div>
                {/* Botão Entrada */}
                <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:16}}
                  className="flex items-center gap-2">
                  <span className="bg-white dark:bg-[#162032] text-xs font-bold px-2 py-1 rounded-full shadow text-[#1A2332] dark:text-[#E2EAF4]">Entrada</span>
                  <button onClick={()=>{setFabOpen(false);setShowLancamento('income')}}
                    className="w-12 h-12 rounded-full bg-[#34D399] text-white flex items-center justify-center shadow-lg opacity-80">
                    <ArrowUpCircle size={22}/>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
          {/* Botão principal */}
          <motion.button animate={{rotate: fabOpen ? 45 : 0}} transition={{duration:0.2}}
            onClick={()=>setFabOpen(v=>!v)}
            className="w-14 h-14 rounded-full bg-secondary text-white flex items-center justify-center shadow-xl opacity-[0.85]">
            <Plus size={26}/>
          </motion.button>
        </div>
      )}

      {/* Modal */}
      <LancamentoModal 
        isOpen={!!showLancamento} 
        onClose={() => setShowLancamento(false)} 
        isDarkMode={isDarkMode} 
        defaultType={showLancamento || 'income'}
      />
    </div>
  );
};

