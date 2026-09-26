import {
  addDays,
  defaultListTitle,
  describeRange,
  monthGrid,
  nextRange,
  rangeDays,
  rangePresets,
  startOfWeek,
  toDateStr,
} from './shoppingDates';

describe('fechas básicas', () => {
  test('toDateStr usa la fecha local y addDays cruza mes y año', () => {
    expect(toDateStr(new Date(2026, 8, 5))).toBe('2026-09-05');
    expect(addDays('2026-09-28', 5)).toBe('2026-10-03');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  test('startOfWeek devuelve el lunes (domingo incluido)', () => {
    expect(startOfWeek('2026-09-25')).toBe('2026-09-21'); // viernes
    expect(startOfWeek('2026-09-21')).toBe('2026-09-21'); // lunes
    expect(startOfWeek('2026-09-27')).toBe('2026-09-21'); // domingo
  });
});

describe('rangePresets', () => {
  const presets = Object.fromEntries(rangePresets('2026-09-25').map((p) => [p.id, p.range]));
  test('hoy, mañana, semana, próximos 7 días y resto del mes', () => {
    expect(presets.today).toEqual({ start: '2026-09-25', end: '2026-09-25' });
    expect(presets.tomorrow).toEqual({ start: '2026-09-26', end: '2026-09-26' });
    expect(presets.week).toEqual({ start: '2026-09-21', end: '2026-09-27' });
    expect(presets.next7).toEqual({ start: '2026-09-25', end: '2026-10-01' });
    expect(presets.month).toEqual({ start: '2026-09-25', end: '2026-09-30' });
  });
});

describe('nextRange (toques en el calendario)', () => {
  test('1er toque = un día; 2º = rango (en cualquier orden); 3º reinicia', () => {
    const first = nextRange(null, '2026-09-27');
    expect(first).toEqual({ start: '2026-09-27', end: '2026-09-27' });
    expect(nextRange(first, '2026-09-30')).toEqual({ start: '2026-09-27', end: '2026-09-30' });
    expect(nextRange(first, '2026-09-24')).toEqual({ start: '2026-09-24', end: '2026-09-27' });
    expect(nextRange(nextRange(first, '2026-09-30'), '2026-10-05')).toEqual({ start: '2026-10-05', end: '2026-10-05' });
  });
  test('tocar el mismo día no cambia nada', () => {
    const one = { start: '2026-09-27', end: '2026-09-27' };
    expect(nextRange(one, '2026-09-27')).toBe(one);
  });
});

describe('monthGrid', () => {
  test('septiembre 2026 empieza en martes y rellena hasta múltiplo de 7', () => {
    const cells = monthGrid(2026, 9);
    expect(cells.length % 7).toBe(0);
    expect(cells.slice(0, 2)).toEqual([null, '2026-09-01']);
    expect(cells.filter(Boolean)).toHaveLength(30);
    expect(cells[cells.length - 1]).toBeNull();
  });
  test('un mes que empieza en lunes no lleva huecos delante', () => {
    expect(monthGrid(2026, 6)[0]).toBe('2026-06-01');
  });
});

describe('textos', () => {
  test('describeRange', () => {
    expect(describeRange({ start: '2026-09-27', end: '2026-09-27' })).toBe('27 sep');
    expect(describeRange({ start: '2026-09-27', end: '2026-09-30' })).toBe('27–30 sep');
    expect(describeRange({ start: '2026-09-28', end: '2026-10-03' })).toBe('28 sep – 3 oct');
  });
  test('título por defecto y días del rango', () => {
    expect(defaultListTitle({ start: '2026-09-27', end: '2026-09-30' })).toBe('Compra 27–30 sep');
    expect(rangeDays({ start: '2026-09-27', end: '2026-09-27' })).toBe(1);
    expect(rangeDays({ start: '2026-09-27', end: '2026-09-30' })).toBe(4);
    expect(rangeDays({ start: '2026-10-25', end: '2026-10-31' })).toBe(7); // cruza el cambio de hora
  });
});
