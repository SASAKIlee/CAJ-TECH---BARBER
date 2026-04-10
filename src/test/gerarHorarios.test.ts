import { describe, expect, test } from 'vitest';

function gerarHorarios(abertura = "09:00", fechamento = "18:00", inicioAlmoco = "12:00", fimAlmoco = "13:00") {
  const horarios: string[] = [];
  let [horaAtual, minAtual] = abertura.split(':').map(Number);
  const [horaFim, minFim] = fechamento.split(':').map(Number);
  const [horaIniAlmoco, minIniAlmoco] = inicioAlmoco.split(':').map(Number);
  const [horaFimAlmoco, minFimAlmoco] = fimAlmoco.split(':').map(Number);

  while (horaAtual < horaFim || (horaAtual === horaFim && minAtual < minFim)) {
    const isHoraAlmoco =
      (horaAtual > horaIniAlmoco || (horaAtual === horaIniAlmoco && minAtual >= minIniAlmoco)) &&
      (horaAtual < horaFimAlmoco || (horaAtual === horaFimAlmoco && minAtual < minFimAlmoco));

    if (!isHoraAlmoco) {
      horarios.push(`${String(horaAtual).padStart(2, '0')}:${String(minAtual).padStart(2, '0')}`);
    }

    minAtual += 30;
    if (minAtual >= 60) { minAtual -= 60; horaAtual += 1; }
  }
  return horarios;
}

describe('gerarHorarios', () => {
  test('deve gerar horários a cada 30 minutos', () => {
    const horarios = gerarHorarios("09:00", "10:00");
    expect(horarios).toEqual(["09:00", "09:30"]);
  });

  test('deve pular horário de almoço', () => {
    const horarios = gerarHorarios("11:00", "14:00", "12:00", "13:00");
    expect(horarios).toContain("11:00");
    expect(horarios).toContain("11:30");
    expect(horarios).not.toContain("12:00");
    expect(horarios).not.toContain("12:30");
    expect(horarios).toContain("13:00");
    expect(horarios).toContain("13:30");
  });

  test('deve lidar com almoço começando em horário quebrado', () => {
    const horarios = gerarHorarios("09:00", "14:00", "12:30", "13:30");
    expect(horarios).toContain("12:00");
    expect(horarios).not.toContain("12:30");
    expect(horarios).not.toContain("13:00");
    expect(horarios).toContain("13:30");
  });
});
