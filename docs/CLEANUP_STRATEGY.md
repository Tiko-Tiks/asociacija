# Švarinimo Strategija: Išvalyti Nereikalingus Dalykus

## Tikslas
Išvalyti nereikalingus failus, funkcijas ir komponentus, paliekant tik veikiančią infrastruktūrą. Tai padės Cursor geriau suprasti kodą ir sumažins painiavą.

## Principai

1. **SAUGUMAS PIRMIAUSIA** - Nieko nedeletiname be patikrinimo
2. **BACKUP PRIVALOMAS** - Prieš bet kokį šalinimą sukuriame backup
3. **TESTAVIMAS** - Po kiekvieno šalinimo testuojame
4. **GRADUAL** - Šaliname po truputį, ne viską vienu metu

## Švarinimo Fazių Planas

### FAZĖ 1: Identifikavimas (1-2 dienos)

#### 1.1 Nenaudojamų Failų Identifikavimas
- [ ] Rasti failus, kurie niekur neimportuojami
- [ ] Rasti failus, kurie turi `TODO`, `FIXME`, `DEPRECATED`
- [ ] Rasti failus, kurie niekada nebuvo commit'inti arba senai modifikuoti
- [ ] Rasti test failus, kurie neveikia

#### 1.2 Nenaudojamų Funkcijų Identifikavimas
- [ ] Rasti RPC funkcijas, kurios niekur nekviečiamos
- [ ] Rasti server actions, kurie niekur neimportuojami
- [ ] Rasti komponentus, kurie niekur nenaudojami

#### 1.3 Nenaudojamų Lentelių Identifikavimas
- [ ] Rasti lenteles be duomenų
- [ ] Rasti lenteles, kurios niekur nenaudojamos
- [ ] Rasti views, kurios niekur nenaudojamos

### FAZĖ 2: Analizė ir Dokumentacija (1 diena)

#### 2.1 Priklausomybių Analizė
- [ ] Sukurti importų grafiką
- [ ] Identifikuoti izoliuotus modulius
- [ ] Identifikuoti priklausomybes

#### 2.2 Veikiančių Komponentų Dokumentacija
- [ ] Dokumentuoti, kas tikrai veikia
- [ ] Sukurti veikiančių funkcijų sąrašą
- [ ] Sukurti veikiančių komponentų sąrašą

### FAZĖ 3: Šalinimas (2-3 dienos)

#### 3.1 Test Failų Šalinimas
- [ ] Pašalinti neveikiančius test failus
- [ ] Palikti tik veikiančius testus

#### 3.2 Nenaudojamų Komponentų Šalinimas
- [ ] Pašalinti nenaudojamus komponentus
- [ ] Pašalinti nenaudojamus server actions
- [ ] Pašalinti nenaudojamas RPC funkcijas

#### 3.3 Duomenų Bazės Šalinimas
- [ ] Pašalinti nenaudojamas lenteles (su atsargumu!)
- [ ] Pašalinti nenaudojamas funkcijas
- [ ] Pašalinti nenaudojamas views

### FAZĖ 4: Organizavimas (1-2 dienos)

#### 4.1 Failų Organizavimas
- [ ] Organizuoti failus pagal funkcionalumą
- [ ] Sukurti aiškią katalogų struktūrą
- [ ] Pridėti README failus

#### 4.2 Dokumentacijos Atnaujinimas
- [ ] Atnaujinti README
- [ ] Sukurti ARCHITECTURE.md
- [ ] Dokumentuoti veikiančias funkcijas

### FAZĖ 5: Testavimas ir Validacija (1-2 dienos)

#### 5.1 Funkcinis Testavimas
- [ ] Testuoti visus veikiančius scenarijus
- [ ] Patikrinti, ar niekas nesugedė

#### 5.2 Cursor Testavimas
- [ ] Patikrinti, ar Cursor geriau supranta kodą
- [ ] Patikrinti, ar autocomplete veikia geriau

## Šalinimo Prioritetai

### PRIORITETAS 1 (Saugu šalinti)
- Nenaudojami test failai
- Nenaudojami komponentai
- Nenaudojami server actions
- Nenaudojamos RPC funkcijos

### PRIORITETAS 2 (Atsargiai)
- Nenaudojamos lentelės (tik jei tikrai tuščios ir niekur nenaudojamos)
- Nenaudojamos views
- Nenaudojamos policies

### PRIORITETAS 3 (Labai atsargiai)
- Nenaudojami enum tipai (tik jei tikrai niekur nenaudojami)
- Nenaudojami constraints

## Rizikos Valdymas

### Rizikos
1. **Kodo praradimas** - Mitigacija: pilnas backup prieš šalinimą
2. **Funkcionalumo praradimas** - Mitigacija: išsamus testavimas
3. **Priklausomybių praradimas** - Mitigacija: priklausomybių analizė

### Rollback Planas
1. Atkurti failus iš backup
2. Patikrinti, ar viskas veikia

## Sekimo Metodai

### Checklist
- Naudoti šį dokumentą kaip checklist
- Pažymėti kiekvieną užduotį kaip atliktą

### Versijų Valdymas
- Kiekvienas fazis turėtų būti commit'as
- Naudoti feature branch'us
- Code review prieš merge

## Laiko Įvertinimas

- **FAZĖ 1**: 1-2 dienos
- **FAZĖ 2**: 1 diena
- **FAZĖ 3**: 2-3 dienos
- **FAZĖ 4**: 1-2 dienos
- **FAZĖ 5**: 1-2 dienos

**IŠ VISO**: ~6-10 darbo dienų

## Kitas Žingsnis

Pradėti nuo **FAZĖS 1.1** - Nenaudojamų Failų Identifikavimo.

