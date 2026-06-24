export type Role = "owner" | "atendente" | "tecnico";

export type OSStatus =
  | "aguardando"
  | "aceito"
  | "em_atendimento"
  | "finalizado"
  | "entregue"
  | "recusado";

export interface Tenant {
  id: string;
  nome: string;
  slug: string;
  created_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  created_at: string;
}

export interface Cliente {
  id: string;
  tenant_id: string;
  nome: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  cpf?: string;
  obs?: string;
  created_at: string;
}

export interface Veiculo {
  id: string;
  tenant_id: string;
  cliente_id: string;
  placa: string;
  modelo: string;
  marca: string;
  cor: string;
  ano?: number;
  obs?: string;
  created_at: string;
  clientes?: Cliente;
}

export interface Servico {
  id: string;
  tenant_id: string;
  nome: string;
  descricao?: string;
  preco_base: number;
  duracao_min?: number;
  categoria?: string;
  ativo: boolean;
}

export interface FormaPagamento {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: "dinheiro" | "pix" | "credito" | "debito" | "convenio" | "outro";
}

export interface Funcionario {
  id: string;
  tenant_id: string;
  profile_id?: string;
  nome: string;
  profissao?: string;
  comissao_pct?: number;
  ativo: boolean;
}

export interface OSServico {
  id: string;
  os_id: string;
  servico_id?: string;
  nome: string;
  preco: number;
  funcionario_id?: string;
  funcionarios?: Funcionario;
}

export interface OSFoto {
  id: string;
  os_id: string;
  tipo: "antes" | "depois" | "checklist";
  url: string;
  created_at: string;
}

export interface OrdemServico {
  id: string;
  tenant_id: string;
  numero: number;
  cliente_id: string;
  veiculo_id: string;
  status: OSStatus;
  data_entrada: string;
  hora_entrada?: string;
  hora_saida_prevista?: string;
  vaga?: number;
  checklist_entrada?: Record<string, boolean | string>;
  observacoes?: string;
  valor_total?: number;
  desconto?: number;
  valor_final?: number;
  forma_pagamento_id?: string;
  tecnico_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  clientes?: Cliente;
  veiculos?: Veiculo;
  os_servicos?: OSServico[];
  os_fotos?: OSFoto[];
  formas_pagamento?: FormaPagamento;
  funcionarios?: Funcionario;
}

export interface Configuracao {
  id: string;
  tenant_id: string;
  nome_fantasia: string;
  vagas_dia: number;
  horario_abertura: string;
  horario_fechamento: string;
  logo_url?: string;
}
