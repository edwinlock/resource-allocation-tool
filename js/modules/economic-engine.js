import { CONFIG } from './constants.js';

const { ALLOCATABLE_BUDGET, MAX_SESSIONS } = CONFIG;

// Compute child-specific human capital, as a combination of ability and parental investment
function humanCapital(ability, investment, scenario) {
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

function computeAlpha(preEarnings1, preEarnings2, scenario) {
    const amax = Math.max(preEarnings1, preEarnings2)
    return MAX_SESSIONS / (humanCapital(amax, ALLOCATABLE_BUDGET, scenario)**scenario.theta)
}

// Compute earnings for specific investment using the human capital function and scenario parameter theta
function earnings(ability, investment, scenario, alpha) {
    return alpha * humanCapital(ability, investment, scenario)**scenario.theta
}

// Main function to compute all economic outcomes for a scenario
// Returns the data instead of mutating global state
export function computeOutcomes(session, scenario) {
    const preEarnings1 = session.preEarnings1;
    const preEarnings2 = session.preEarnings2;

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