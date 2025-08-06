import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os
import pandas.testing as pdt
from matplotlib.backends.backend_pdf import PdfPages



# ========================================== #
#             SLIDER EXERCISE 
# ========================================== #

# Begin dataframe
a_high = [6, 5, 4]
a_low = [1, 2, 3]
a_gap = ['large', 'medium', 'small']

df_a = pd.DataFrame({
    'a_high': a_high,
    'a_low': a_low,
    'a_gap': a_gap
})

x_high = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
x_low = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]

df_x = pd.DataFrame({
    'x_high': x_high,
    'x_low': x_low
})

# Crossjoin
df_x['key'] = 1
df_a['key'] = 1
df_ax = pd.merge(df_a, df_x, on='key').drop('key', axis=1)


# Create sigma-theta scenarios
sigma = [1, 0.5, 0, -2, -4]
theta = [1, 2]
scenario = ['ADD', 'CES05', 'CD', 'CES-4', 'CES-4']

# Create a mapping from sigma value to scenario label
scenario_map = dict(zip(sigma, scenario))

# Build data list
data = []
for s in sigma:
    for t in theta:
        data.append({'sigma': s, 'theta': t})

# Create DataFrame
scenarios = pd.DataFrame(data)

# Add 'scenario' column by mapping from 'sigma'
scenarios['scenario'] = scenarios['sigma'].map(scenario_map)

# Final dataset before computing H, E

df = df_ax.merge(scenarios, how='cross')

df_sort = df.sort_values(by=['sigma', 'a_gap'])

# === Computing h_*, alpha, e_*, e_rounded*, e_total === #

def compute_H(a, x, sigma, gamma=0.5):
    """General Human Capital Production Function"""
    if sigma <= 0 and (a == 0 or x == 0):
        return 0

    if sigma == 1:
        # Additive
        return gamma * a + (1 - gamma) * x
    elif sigma == 0:
        # Cobb-Douglas
        return np.exp(gamma * np.log(a) + (1 - gamma) * np.log(x))
    else:
        # CES
        return (gamma * a**sigma + (1 - gamma) * x**sigma)**(1/sigma)


# alpha = 15 / H ^ theta
def compute_alpha(a, x, sigma, theta, gamma=0.5, sessions=15):
    h = compute_H(a, x, sigma, gamma)
    return sessions / (h ** theta) if h > 0 else 0

# Compute alpha row-wise to df
df_sort['alpha'] = df_sort.apply(lambda row: compute_alpha(
    a=row['a_high'],
    x=9,
    theta=row['theta'],
    sigma=row['sigma'],
    gamma=0.5,
    sessions=15
), axis=1)

# Compute h_high and h_low
df_sort['h_high'] = df_sort.apply(lambda row: compute_H(
    a=row['a_high'],
    x=row['x_high'],
    sigma=row['sigma'],
    gamma=0.5
), axis=1)

df_sort['h_low'] = df_sort.apply(lambda row: compute_H(
    a=row['a_low'],
    x=row['x_low'],
    sigma=row['sigma'],
    gamma=0.5
), axis=1)

def calculate_e(h_value, alpha, theta):
    """Calculate e using the formula: e = alpha * H^theta"""
    if h_value == 0:
        return 0
    return alpha * np.power(h_value, theta)

# Compute e_high and e_low
df_sort['e_high'] = df_sort.apply(lambda row: calculate_e(
    h_value=row['h_high'],
    alpha=row['alpha'],
    theta=row['theta']
), axis=1)

df_sort['e_low'] = df_sort.apply(lambda row: calculate_e(
    h_value=row['h_low'],
    alpha=row['alpha'],
    theta=row['theta']
), axis=1)


# Included rounded and total e*

df_sort['e1_rounded'] = df_sort['e_high'].round().astype(int)
df_sort['e2_rounded'] = df_sort['e_low'].round().astype(int)
df_sort['e_tot'] = df_sort['e1_rounded'] + df_sort['e2_rounded']

# ==================================== #
#       Systematic Visualization
# ==================================== #

# Ensure data types are correct
df_sort['x_high'] = df_sort['x_high'].astype(int)
df_sort['e1_rounded'] = df_sort['e1_rounded'].astype(int)
df_sort['e2_rounded'] = df_sort['e2_rounded'].astype(int)
df_sort['e_tot'] = df_sort['e_tot'].astype(int)

# Identify all unique (sigma, theta) combinations
plot_groups = df_sort[['scenario', 'theta']].drop_duplicates()

# Set the canvas
plt.style.use("default")
sns.set_context("notebook")

# Output directory
output_dir = "~/Desktop"
os.makedirs(output_dir, exist_ok=True)

# Custom colors
colors = {
    'e1_rounded': 'darkorange',  # Excel's burntorange
    'e2_rounded': 'green',
    'e_tot': 'cornflowerblue'
}

# Store all figures
figures = {}

# Loop through each (scenario, theta) combo
for (scenario, theta) in plot_groups.itertuples(index=False):
    df_subset = df_sort[(df_sort['scenario'] == scenario) & (df_sort['theta'] == theta)]
    gaps = df_subset['a_gap'].unique()
    n_gaps = len(gaps)

    fig, axes = plt.subplots(nrows=1, ncols=n_gaps, figsize=(5 * n_gaps, 4), sharey=True)
    if n_gaps == 1:
        axes = [axes]

    for ax, gap in zip(axes, gaps):
        df_gap = df_subset[df_subset['a_gap'] == gap].sort_values('x_high')

        ax.plot(df_gap['x_high'], df_gap['e1_rounded'], label='e1_rounded',
                color=colors['e1_rounded'], marker='o')
        ax.plot(df_gap['x_high'], df_gap['e2_rounded'], label='e2_rounded',
                color=colors['e2_rounded'], marker='o')
        ax.plot(df_gap['x_high'], df_gap['e_tot'], label='e_tot',
                color=colors['e_tot'], marker='o')

        ax.set_title(f"{scenario}, θ={theta}, {gap} gap")
        ax.grid(True, linestyle='--', alpha=0.7)
        ax.set_xticks(df_gap['x_high'])

        # Remove axis labels
        ax.set_xlabel("")
        ax.set_ylabel("")

    fig.suptitle(f"{scenario} production, θ={theta}", fontsize=14)
    fig.tight_layout(rect=[0, 0, 1, 0.95])

    fig_path = os.path.join(output_dir, f"{scenario}_theta{theta}.png")
    fig.savefig(fig_path)
    figures[(scenario, theta)] = fig_path




# GRAVEYARD
