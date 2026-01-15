# SQL Moduliai

Šiame kataloge yra organizuoti SQL failai pagal modulius.

## Modulių Struktūra

### governance/
Governance konfigūracijos, validacijos ir compliance funkcijos.

### meetings/
Susirinkimų valdymas, agenda, dokumentai.

### voting/
Balsavimo sistema, vote funkcijos, RLS policies.

### resolutions/
Nutarimų valdymas ir funkcijos.

### projects/
Projektų ir idejų valdymas.

### members/
Narių valdymas, invites, debts.

### protocols/
Protokolų valdymas ir PDF generavimas.

### organizations/
Organizacijų valdymas, review, logos.

### finance/
Sąskaitų valdymas, validacijos, schedule funkcijos.

### migrations/
Migracijos ir pataisymai.

### core/
Pagrindinės schemos (jei reikia).

## Naudojimas

Kiekvienas modulis turi savo failus:
- `*_module.sql` - Lentelės ir pagrindinė schema
- `*_rpc_functions.sql` - RPC funkcijos
- `*_rls_policies.sql` - RLS policies
- `*_rpc.sql` - Atskiri RPC failai

## Pastaba

Visos schemos yra `sql/consolidated_all.sql` faile kaip reference.

