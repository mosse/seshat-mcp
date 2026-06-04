# Model audit log — recovering & validating the Turchin (2022) model

> Companion to [`MODEL.md`](MODEL.md). This records *how* the real model was recovered
> from the replication deposit and *what was independently verified*, so the engine work
> (SCI-1c) rests on audited facts rather than transcription. Every number below was
> reproduced from the deposit's own data, not copied from the paper text.

## 1. Provenance

| Item | Value |
|------|-------|
| Paper | Turchin et al. (2022), *Science Advances* 8(25):eabn3517, DOI [10.1126/sciadv.abn3517](https://www.science.org/doi/10.1126/sciadv.abn3517) |
| Deposit | OSF preprint [osf.io/tekb6](https://osf.io/tekb6/) → project node `qtsza` |
| Data+code zip | `Evol_SPC_SI_Draft.zip` (`osf.io/download/z6vu7`), 30,094,971 bytes |
| zip SHA-256 | `dbfa4219a08b09c35577fbca2d9fae8e1d79fabaae99127c54493190088781c5` |
| SI PDF | `Evol_SPC_SI_Draft_for_print.pdf` (`osf.io/download/ke2jt`), 92 pp |
| Retrieved | 2026-06-03 |

Key files inside the zip:
- `Data/MultiVar.csv` — the **standardized regression dataset** (982 rows; the model's actual input).
- `utils/fRegrDat.R` — builds the regression dataset and **standardizes** it.
- `Data/TableData.Rdata` — raw/aggregated Seshat variables (`AggrSCWarAgriRelig`, `TSDat` with all 168 coded variables) — relevant to future real-data work (Layer 3).
- `Images/Fig4.png` — the forward-simulation figure (validation target).

## 2. Standardization method — confirmed from source

From `utils/fRegrDat.R` (verbatim, final lines):

```r
NonStRegrDat <- RegrDat
# Standardized coefficients
for(i in 4:(ncol(RegrDat))){
  RegrDat[,i] <- (RegrDat[,i] - mean(RegrDat[,i], na.rm=TRUE))/sd(RegrDat[,i], na.rm=TRUE) }
```

So **every variable is full-sample z-scored** `(x − mean)/sd`, using the mean/SD across all
982 polity-century observations. `MultiVar.csv` holds the result (its values are z-scores).

**Subtlety (important for the engine):** `Scale.sq` is `standardize(raw_Scale²)` — the z-score
of the *raw* square — **not** `(standardized Scale)²`. The square is formed *before*
standardization, then standardized as its own column. Same for `Hier.sq`, `Gov.sq`.

## 3. Coefficient audit — independent re-fit (PASSED)

**Method:** loaded `MultiVar.csv` (n=982) and re-fit each response by OLS (statsmodels) with the
published predictor set, then compared to the SUReg coefficients in [`MODEL.md`](MODEL.md).

**Result — exact match to 5 dp (Δ = 0.00000 on every term):**

| | lag | lag.sq | Agri | AgriLag | MilTech | IronCav | R² |
|--|-----|--------|------|---------|---------|---------|-----|
| **Scale** | 1.20789 | −0.35569 | 0.03096 | 0.03830 | — | 0.09307 | 0.917 |
| **Hier** | 1.03122 | −0.22222 | 0.03260 | 0.04152 | 0.05861 | 0.04420 | 0.888 |
| **Gov** | 1.02589 | −0.24816 | 0.04991 | — | 0.06860 | 0.08744 | 0.876 |

This independently validates **both** the documented coefficients **and** the dataset — the
numbers in `MODEL.md` are reproducible, not transcribed-and-hoped. (OLS reproduces the published
SUReg values exactly here, so no SUReg/GLS step was needed to recover them.)

## 4. Standardized-square maps — recovered (R² = 1.000000)

To run the recurrence forward in standardized space, each step must derive the standardized
`.sq` term from the standardized level. Regressing `X.sq` on `X` and `X²` over `MultiVar.csv`
recovers an exact algebraic map `X.sq = A·X² + B·X + C` (max error ~1e-14):

| Dimension | A | B | C |
|-----------|---|---|---|
| Scale | 0.157112 | 0.960746 | −0.156952 |
| Hier | 0.231611 | 0.774601 | −0.231375 |
| Gov | 0.376006 | 0.689379 | −0.375623 |

(`C ≈ −A` as required by the mean-zero constraint on standardized variables — a self-consistency
check that also passed.)

## 5. The closed-form recurrence (ready for SCI-1c implementation)

Everything below is recovered/validated — no invented constants. All quantities standardized.

```
Scale.sq = 0.157112·Scale² + 0.960746·Scale − 0.156952
Scale'   = 1.20789·Scale − 0.355695·Scale.sq + 0.030962·Agri + 0.0383049·AgriLag + 0.0930742·IronCav

Hier.sq  = 0.231611·Hier²  + 0.774601·Hier  − 0.231375
Hier'    = 1.03122·Hier − 0.222218·Hier.sq + 0.032604·Agri + 0.0415172·AgriLag + 0.0586117·MilTech + 0.0441969·IronCav

Gov.sq   = 0.376006·Gov²   + 0.689379·Gov   − 0.375623
Gov'     = 1.02589·Gov − 0.248156·Gov.sq + 0.0499141·Agri + 0.0685953·MilTech + 0.0874432·IronCav
```

Residual SD for the Monte-Carlo bands (standardized units): Scale ≈ 0.288 (SUReg root MSE);
Hier/Gov ≈ 0.30–0.34 — exact per-equation values are the residual SDs from the re-fit and will be
computed during implementation. Note the paper's residuals are **non-Gaussian** (SI Fig S3); a
Gaussian band is therefore an approximation of its bootstrap and must be labelled as such.

## 6. What is validated vs. still pending

**Validated (this audit):** the coefficients (independent re-fit), the standardization method,
the `.sq` maps, and the self-consistency checks. The model spec in §5 is trustworthy.

**Pending (tracked as SCI-1c / Layer 3):**
- Wiring §5 into [`model.ts`](../packages/shared/src/model.ts) with a cross-implementation
  validation test (TS engine vs a Python reference trajectory) and reproducing Fig 4.
- Mapping the app's raw inputs into standardized space, and the qualitative→standardized
  injection deltas for scenarios. The exact raw means/SDs for arbitrary inputs require
  reproducing the upstream PCA/aggregation pipeline (Scale = PCA of Pop/Terr/Cap; IronCav,
  MilTech aggregations) from `TableData.Rdata` — not yet done.
- Real input *data*: the engine spec is real, but end-to-end app output stays illustrative until
  the ETL produces real Seshat-derived, standardized inputs (currently "illustrative defaults").

## 7. Reproducing this audit

Requires the OSF zip (not committed; SHA-256 above). With its `Data/MultiVar.csv`:

```python
import pandas as pd, statsmodels.formula.api as smf
df = pd.read_csv("MultiVar.csv").rename(columns={"Scale.sq":"Scale_sq","Hier.sq":"Hier_sq","Gov.sq":"Gov_sq"})
smf.ols("Scale_t1 ~ Scale + Scale_sq + Agri + AgriLag + IronCav", df).fit().params          # §3
df["X2"]=df["Scale"]**2; smf.ols("Scale_sq ~ Scale + X2", df).fit().params                   # §4
```
