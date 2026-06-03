# The counterfactual model — methods & provenance

> Status: the **real published coefficients are now sourced and recorded here** (SCI-1b,
> step 1). Wiring them into the engine requires reconciling input standardisation
> (SCI-1c) — see "Gap to full fidelity" below. Until then the running engine uses an
> interim illustrative calibration (see [`model.ts`](../packages/shared/src/model.ts)).

## Source

- **Paper:** Turchin, P., et al. (2022). *Disentangling the evolutionary drivers of social
  complexity: A comprehensive test of hypotheses.* **Science Advances** 8(25): eabn3517.
  DOI [10.1126/sciadv.abn3517](https://www.science.org/doi/10.1126/sciadv.abn3517).
  Open access: [PMC9232109](https://pmc.ncbi.nlm.nih.gov/articles/PMC9232109/).
- **Replication deposit (OSF):** <https://osf.io/tekb6/> — preprint + Supplementary Text +
  data files. Supplementary Information PDF: `Evol_SPC_SI_Draft_for_print.pdf`; data + R
  scripts: `Evol_SPC_SI_Draft.zip`; running instructions:
  `Instructions_For_Running_R_Scripts_in_Jupyter_Notebook.pdf`.
- **Seshat data:** <http://seshatdatabank.info/datasets>.

## What the model is

A **dynamic regression** (DR): each social-complexity dimension at time *t+1* is predicted
from its own value at *t* (autoregression), a **quadratic** self-term (saturation toward a
carrying capacity), and exogenous predictors. Three complexity dimensions are modelled jointly
via **Seemingly Unrelated Regression (SUReg)**:

- **Scale** — population, territory, capital size (the dominant dimension)
- **Hier** — settlement/administrative hierarchy depth
- **Gov** — government/institutional sophistication

A composite **PC1** social-complexity index (from Turchin et al. 2018, PNAS) summarises the
nine characteristics; in this app PC1 is derived from the three dimensions.

### Functional form

```
X_{t+1} = β0 + β1·X_t + β2·X_t² + Σ_k βk·Predictor_k(t) + ε_t
```

The `β2·X_t²` term is **negative** for every dimension — this is the saturation/carrying-capacity
dynamic, and it is the key structural feature the previous engine lacked (it was purely linear).

### Coefficients — SUReg joint model (standardised variables)

Transcribed from the SI (`Evol_SPC_SI_Draft_for_print.pdf`, SUReg results). All variables are
**standardised (z-scored)** across the Seshat sample, so intercepts are ≈ 0.

| Predictor | **Scale** | **Hier** | **Gov** |
|-----------|----------:|---------:|--------:|
| lag (Xₜ) | 1.20789 | 1.03122 | 1.02589 |
| lag² (Xₜ²) | −0.355695 | −0.222218 | −0.248156 |
| Agri | 0.030962 | 0.032604 | 0.0499141 |
| AgriLag | 0.0383049 | 0.0415172 | — |
| MilTech | — | 0.0586117 | 0.0685953 |
| IronCav | 0.0930742 | 0.0441969 | 0.0874432 |
| intercept | ≈ 0 | ≈ 0 | ≈ 0 |

- **Fit:** SUReg overall R² ≈ 0.917, *n* = 982; per-dimension R² 0.89–0.92.
- **Residual standard error:** Scale ≈ 0.288 (root MSE, SUReg); Gov ≈ 0.337 (per-response);
  Hier ≈ 0.31 (per-response, approximate). These set the noise scale for confidence bands.

> The unstandardised "natural units" form reported as Eq. 2 in the main text
> (`Scaleₜ₊₁ = −0.24 + 1.2·Scaleₜ − 0.04·Scaleₜ² + 0.10·Agriₜ + 0.00002·AgriLagₜ + 0.16·IronCavₜ`)
> is the same Scale model after back-transforming to raw variable units — note how different the
> AgriLag coefficient is (0.00002 vs 0.0383), which is purely a scaling artefact.

### Predictor definitions

- **IronCav** — joint spread of cavalry + iron metallurgy (the strongest predictor).
- **MilTech** — warfare-technology intensity proxy.
- **Agri** — agricultural productivity; **AgriLag** — antiquity of agriculture (time since onset).

### Uncertainty — important

The paper explicitly reports that **residuals are not Gaussian** (SI Figure S3) and therefore
uses **non-parametric bootstrap** for confidence intervals. Any Monte-Carlo band built with
Gaussian noise (as the current engine does) is an approximation of the published bootstrap
procedure and should be labelled as such.

## Gap to full fidelity (SCI-1c)

Having the coefficients is necessary but not sufficient. To produce quantitatively valid output:

1. **Standardise inputs to match.** The coefficients assume z-scored predictors. The engine's
   inputs (`iron_cav` ∈ {0,1,2}, `agri_years_since` in raw years, etc.) must be standardised
   using the same means/SDs the paper used — extractable from the R scripts in
   `Evol_SPC_SI_Draft.zip`. Without this, the coefficients cannot be applied directly.
2. **Project the three dimensions** (Scale/Hier/Gov) with their own equations, then derive PC1.
3. **Use the real residual SEs** for the bands, and ideally bootstrap from empirical residuals
   rather than Gaussian noise.
4. **Validate** by reproducing the paper's Figure 4 simulated trajectory within tolerance, and
   add a test asserting the in-code coefficients equal the values in this document.

Only after (1)–(4) should the user-facing "illustrative approximation" caveats be removed.
