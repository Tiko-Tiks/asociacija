# Staging/Testavimo Workflow

## Apžvalga

Sukurtas staging/testavimo workflow'as, kad galėtumėte dirbti su pakeitimais be production rizikos.

## Branch Strategija

- **`master`** - Production branch (tik patvirtinti, testuoti pakeitimai)
- **`staging`** - Staging/Testavimo branch (aktyvus development)

## Kaip dirbti su Staging

### 1. Perjungti į staging branch

```bash
git checkout staging
```

### 2. Atlikti pakeitimus

Dirbkite su staging branch'u kaip įprastai:
- Commit'inti pakeitimus
- Push'inti į staging

```bash
git add .
git commit -m "Jūsų pakeitimų aprašymas"
git push origin staging
```

### 3. Automatinis Staging Deployment

Po kiekvieno push į `staging` branch'ą:
- GitHub Actions automatiškai paleis build'ą
- Deploy'ins į Vercel **Preview** environment
- Gausite unikalų preview URL (pvz., `asociacija-staging-abc123.vercel.app`)

### 4. Testavimas Staging'e

1. Eikite į GitHub Actions: `https://github.com/Tiko-Tiks/asociacija/actions`
2. Raskite "Deploy to Vercel (Staging)" workflow run'ą
3. Deployment URL bus matomas workflow run'e
4. Testuokite visus funkcionalumus staging environment'e

## Kaip perkelti į Production

### 1. Patikrinti, kad staging veikia

- Testuokite visus funkcionalumus staging'e
- Patikrinkite, kad nėra klaidų
- Patikrinkite, kad visi pakeitimai veikia kaip tikėtasi

### 2. Merge'inti į master

```bash
# Perjungti į master
git checkout master

# Pull latest changes
git pull origin master

# Merge staging į master
git merge staging

# Push į master (trigger'ins production deployment)
git push origin master
```

### 3. Production Deployment

Po push į `master`:
- GitHub Actions automatiškai paleis production build'ą
- Deploy'ins į Vercel **Production** environment
- Production URL bus atnaujintas

## Workflow Failai

### `.github/workflows/deploy.yml`
- **Trigger:** Push į `master` branch
- **Environment:** Production
- **Deployment:** Vercel Production

### `.github/workflows/deploy-staging.yml`
- **Trigger:** Push į `staging` branch
- **Environment:** Preview
- **Deployment:** Vercel Preview (unikalus URL kiekvienam deployment'ui)

## Svarbu

1. **NIKADA necommit'inti tiesiogiai į `master`** - visada naudokite staging
2. **Visada testuokite staging'e** prieš merge'inant į production
3. **Production deployment** yra automatinis po merge į master
4. **Staging URL** keičiasi su kiekvienu deployment'u (preview URL)

## Troubleshooting

### Staging deployment neveikia
- Patikrinkite GitHub Actions: `https://github.com/Tiko-Tiks/asociacija/actions`
- Patikrinkite, ar staging branch egzistuoja: `git branch -a`
- Patikrinkite, ar workflow failas yra commit'intas

### Production deployment neveikia
- Patikrinkite, ar merge į master buvo sėkmingas
- Patikrinkite GitHub Actions production workflow
- Patikrinkite Vercel dashboard

## Rekomendacijos

1. **Feature branches:** Jei dirbate su didesniais feature'ais, sukurkite feature branch'ą iš staging, o po to merge'inti į staging
2. **Code review:** Jei dirbate komandoje, naudokite Pull Requests iš staging į master
3. **Testing:** Visada testuokite staging'e prieš production deployment'ą

