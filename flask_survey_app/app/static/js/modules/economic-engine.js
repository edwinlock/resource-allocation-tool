import { CONFIG } from './constants.js';

const { ALLOCATABLE_BUDGET, GAP_THRESHOLD, MAX_SESSIONS } = CONFIG;

// Mapping ability scores to 'performance ratios':
// Raw scores are between 0 and 100
// There are two kinds of gap: *medium* and *large*
// need to distinguish between child 1 being better than child 2 and vice versa
export function computePreEarnings(abilityScore1, abilityScore2) {
    let gap = abilityScore1 - abilityScore2;
    if (gap > GAP_THRESHOLD) {  // child1 is much better
        return [6, 1];
    } else if (gap >= 0 && gap <= GAP_THRESHOLD) { // child1 is slightly better
        return [5, 2];
    } else if (gap >= -GAP_THRESHOLD && gap < 0) { // child2 is slightly better
        return [2, 5];
    } else { // child2 is much better
        return [1, 6];
    }
}

// Compute child-specific human capital, as a combination of ability and parental investment
export function humanCapital(ability, investment, scenario) {
    // define local constants, for readibility
    const a = ability;
    const x = investment;
    const sigma = scenario.sigma;
    const gamma = scenario.gamma;
    if (sigma == 0) {
        return a**gamma * x**(1-gamma);
    } else {
        return (gamma * a**sigma + (1-gamma) * x**sigma)**(1/sigma);
    }
}

export function computeAlpha(preEarnings1, preEarnings2, scenario) {
    const amax = Math.max(preEarnings1, preEarnings2)
    return MAX_SESSIONS / (humanCapital(amax, ALLOCATABLE_BUDGET, scenario)**scenario.theta)
}

// Compute earnings for specific investment using the human capital function and scenario parameter theta
export function earnings(ability, investment, scenario, alpha) {
    return alpha * humanCapital(ability, investment, scenario)**scenario.theta
}

// Main function to compute all economic outcomes for a scenario
// Returns the data instead of mutating global state
export function computeOutcomes(session, scenario) {
    const pre = computePreEarnings(session.abilityScore1, session.abilityScore2);
    const preEarnings1 = pre[0];
    const preEarnings2 = pre[1];
    
    // Compute alpha first since earnings depend on it
    const alpha = computeAlpha(preEarnings1, preEarnings2, scenario);
    
    // Initialize arrays
    const investments1 = Array(ALLOCATABLE_BUDGET+1).fill(0);
    const investments2 = Array(ALLOCATABLE_BUDGET+1).fill(0);
    const postEarnings1 = Array(ALLOCATABLE_BUDGET+1).fill(0);
    const postEarnings2 = Array(ALLOCATABLE_BUDGET+1).fill(0);
    const aggrEarnings = Array(ALLOCATABLE_BUDGET+1).fill(0);
    const postEarnings1Rounded = Array(ALLOCATABLE_BUDGET+1).fill(0);
    const postEarnings2Rounded = Array(ALLOCATABLE_BUDGET+1).fill(0);
    const aggrEarningsRounded = Array(ALLOCATABLE_BUDGET+1).fill(0);
    
    for (let i=0; i <= ALLOCATABLE_BUDGET; i++) {
        investments1[i] = i;
        investments2[i] = ALLOCATABLE_BUDGET - i;
        
        // Separate investment-only earnings from total earnings
        postEarnings1[i] = earnings(preEarnings1, investments1[i], scenario, alpha);
        postEarnings2[i] = earnings(preEarnings2, investments2[i], scenario, alpha);
        
        // Aggregate earnings based on total earnings
        aggrEarnings[i] = postEarnings1[i] + postEarnings2[i];
        
        // Calculate rounded versions
        postEarnings1Rounded[i] = Math.round(postEarnings1[i]);
        postEarnings2Rounded[i] = Math.round(postEarnings2[i]);
        aggrEarningsRounded[i] = postEarnings1Rounded[i] + postEarnings2Rounded[i];
    }
    
    const maximumEarnings = Math.max(...aggrEarnings);
    const maximumEarningsRounded = Math.max(...aggrEarningsRounded);
    
    // Return calculated data instead of mutating global state
    return {
        preEarnings1,
        preEarnings2,
        investments1,
        investments2,
        postEarnings1,
        postEarnings2,
        aggrEarnings,
        postEarnings1Rounded,
        postEarnings2Rounded,
        aggrEarningsRounded,
        maximumEarnings,
        maximumEarningsRounded,
        alpha
    };
}