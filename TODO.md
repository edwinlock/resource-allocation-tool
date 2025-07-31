**TO DO:**
0. Log-in for the interviewer (such that when it saves the answer, we know who got took it).
1. Survey/Questionnaire structure
2. Sigma-theta slider

**Baseline input from Michelle:**

1. `slider_exercise.py` - Python script with the original exploration of scenarios to show parents: production functions(sigma values), convexity (linear = theta = 1, convex = theta = 2), graphs displaying e_low, e_high, e_total. 
2. Scenario Explanation:
   - Parents in a household decide how to optimally allocate educational resources `x` between two siblings. We model this choice through a three-stage framework that captures the relationship between parental investments, human capital formation, and labor market outcomes.
   - Child-specific human capital is produced through a combination of ability $a_i$ and parental investment $x_i$. We consider three alternative production functions:
       - Cobb-Douglas Production Function
         
         $H_i^{CD} = a_i^{\gamma} \cdot x_i^{1 - \gamma}$; $\sigma=0$
         
       - Additive Production Function
         
         $H_i^{ADD} = \gamma \cdot a_i + (1 - \gamma) \cdot x_i$; $\sigma=1$
         
       - Constant Elasticity of Substitution (CES) Production Function
       - 
         $H_i^{CES} = \left[\gamma \cdot a_i^{\sigma} + (1 - \gamma) \cdot x_i^{\sigma}\right]^{1/\sigma}$; $\sigma \in [-4,-3,-2,0.5]\: \text{excl.}\: 0$
         
      where:
       - $a_i \in [0,1]$ represents child $i$'s ability, transformed into sessions 6-1, or 5-2 for a_high, a_low given the size of the difference between the two. For now, any threshold (i.e. 0.06 difference in scores) returns 'large' 6-1 gap.

       - $x_i \in [0,1]$ denotes the fraction of total allocable budget invested in child $i$ (9 sessions)

       - $\gamma \in [0.5]$ captures parents' preference weighting between ability and resources, with $\gamma = 0.5$ representing equal weighting

       - $\sigma \in [-4, 0.5]$ is the CES substitution parameter, where values closer to 1 represent near-perfect substitutability between ability and investment, and negative values indicate strong beliefs in complementarity

   - Human capital translates into earnings through a convex relationship:
      - $E_i = \alpha \cdot H_i^{\theta}$, where:
         - $\alpha = 1$ is a scaling factor to keep all scenarios within the same range (16 sessions at most)
         - $H_i \in [0,1]$ is the human capital level from the production function
         - $\theta \in [1, 2]$ represents the convexity of returns to human capital in the labor market, with 1 indicating linear returns and 2 convex returns.
