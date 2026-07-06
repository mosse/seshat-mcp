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

Residual SDs for the Monte-Carlo bands (standardized units), computed from the §3 re-fit:

| | Scale | Hier | Gov |
|--|------|------|-----|
| residual SD | **0.288106** | **0.335424** | **0.352592** |

(The Scale value matches the SI's printed SUReg "Root MSE: 0.288106" digit-for-digit — an
additional cross-check.) Note the paper's residuals are **non-Gaussian** (SI Fig S3); a Gaussian
band is therefore an approximation of its bootstrap and must be labelled as such.

## 5b. Predictor standardisation constants — recovered (NEAR-exact)

**Method:** joined the 982 standardized regression rows (`MultiVar.csv`) back to the deposit's raw
table (`TableData.Rdata` → `AggrSCWarAgriRelig`) on (NGA, Time), constructed candidate raw
predictors, z-scored them over the joined sample, and correlated with the standardized columns.

| Predictor | Raw construction | corr(z(raw), std) | mean | sd |
|-----------|------------------|-------------------|------|-----|
| IronCav | `Iron{0,1} + Cavalry{0,0.5,1}` → 0..2 | 0.9962 | 0.61128 | 0.88996 |
| MilTech | Σ(Metal,Project,Weapon,Animal,Armor,Defense), range 0–41 | 0.9916 | 16.387259 | 11.639466 |
| Agri | productivity measure (same scale as the app's) | 0.9958 | 0.575033 | 0.461329 |
| AgriLag | years since agriculture onset | 0.9995 | 2255.386179 | 2529.880727 |

**Status: NEAR-exact, not machine-exact.** The residual gap (corr 0.991–0.9996 rather than 1.0) is
attributable to the paper's **multiple imputation** step (the SI's "Multiple Imputation" section;
`ImpSCDatRepl*.csv` replicates), which the deposit does not expose in final merged form. The
constants above are recovered from the deposit's own raw data and are used for input mapping with
this approximation status documented. Notably, raw IronCav uses the **same 0..2 coding as the
app's `iron_cav` field**, so the flagship iron/cavalry injections map directly.

## 5c. Engine implementation & cross-validation (SCI-1c) — DONE

The recurrence in §5 is implemented in [`packages/shared/src/model.ts`](../packages/shared/src/model.ts)
(`TURCHIN_2022` + `projectForward`), with:
- dynamics in standardized space; PC1 composite = mean of the three dimensions (app-level summary,
  documented as such — the paper models the dimensions separately);
- deterministic path = the pure recurrence; Monte-Carlo path adds Gaussian noise at the §5 residual
  SDs, with an out-of-domain clamp at ±4 (fitting-data range is ≈±2.5);
- input mapping via the §5b constants.

**Validation (automated, in `packages/mcp-server/tests/model.test.ts`):**
1. *Coefficient equality* — the in-code constants are asserted equal to §3–§5 of this document.
2. *Cross-implementation* — an independent Python implementation of the §5 spec generated reference
   trajectories (`tests/fixtures/turchin_reference_trajectory.json`, 3 cases × 4–6 centuries); the
   TS engine reproduces every point to <1e-9.
3. Structural tests: injection direction, quadratic saturation (high complexity is pulled back
   down — the behaviour the old linear engine lacked), band ordering/widening.

## 6. What is validated vs. still pending

**Validated:** the coefficients (independent re-fit, §3), the standardization method (§2), the
`.sq` maps (§4), the residual SDs (§5), the engine implementation (§5c — coefficient-equality +
cross-implementation tests), and the predictor standardisation constants to near-exactness (§5b).

**Pending (Layer 3 and refinements):**
- **Real input data** — the model is real, but end-to-end app output stays *directional* until the
  ETL produces real Seshat-derived inputs (currently "illustrative defaults"). This is the main
  remaining gap, and user-facing copy says so.
- Exact predictor constants — closing the §5b multiple-imputation gap would require re-running the
  paper's imputation pipeline (R scripts in the deposit).
- Fig 4 reproduction — the SI's forward-simulation figure has not been quantitatively reproduced
  (the cross-implementation fixture validates the recurrence itself; Fig 4 additionally depends on
  the paper's start states and noise procedure).
- Bootstrap bands — the Gaussian Monte-Carlo band is labelled as an approximation of the paper's
  non-parametric bootstrap; empirical-residual bootstrap would close this.

## 7. Reproducing this audit

Requires the OSF zip (not committed; SHA-256 above). With its `Data/MultiVar.csv`:

```python
import pandas as pd, statsmodels.formula.api as smf
df = pd.read_csv("MultiVar.csv").rename(columns={"Scale.sq":"Scale_sq","Hier.sq":"Hier_sq","Gov.sq":"Gov_sq"})
smf.ols("Scale_t1 ~ Scale + Scale_sq + Agri + AgriLag + IronCav", df).fit().params          # §3
df["X2"]=df["Scale"]**2; smf.ols("Scale_sq ~ Scale + X2", df).fit().params                   # §4
```
