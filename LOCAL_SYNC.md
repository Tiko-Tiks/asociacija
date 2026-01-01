# Local ir Production Sinchronizacija

## Dabartinė Situacija

- ✅ Local master branch yra sinchronizuotas su production
- ✅ Visi pakeitimai yra commit'inti ir push'inti
- ✅ Staging workflow failai pridėti

## Kaip Sinchronizuoti Local su Production

### 1. Pull Latest Changes iš Production

```bash
# Perjungti į master branch
git checkout master

# Pull latest changes
git pull origin master
```

### 2. Patikrinti Status

```bash
# Patikrinti, ar yra uncommitted changes
git status

# Patikrinti, ar local yra up to date
git log --oneline -5
```

### 3. Jei Yra Local Changes

**Jei norite išsaugoti:**
```bash
# Commit'inti local changes
git add .
git commit -m "Local changes description"
git push origin master
```

**Jei norite atmesti:**
```bash
# Atmesti visus uncommitted changes
git reset --hard origin/master
```

### 4. Sinchronizuoti su Staging

```bash
# Perjungti į staging
git checkout staging

# Pull latest changes
git pull origin staging

# Merge master į staging (jei reikia)
git merge master
```

## Svarbu

- ⚠️ **NIKADA necommit'inkite tiesiogiai į master** - naudokite staging
- ✅ **Visada pull'inkite prieš dirbant**
- ✅ **Commit'inkite ir push'inkite po kiekvieno pakeitimo**

## Troubleshooting

### Problema: "Your branch is behind"

**Sprendimas:**
```bash
git pull origin master
```

### Problema: "Your branch has diverged"

**Sprendimas:**
```bash
# Pull su rebase
git pull --rebase origin master

# Arba merge
git pull origin master
```

### Problema: "Uncommitted changes"

**Sprendimas:**
```bash
# Stash changes
git stash

# Pull
git pull origin master

# Apply stash
git stash pop
```

