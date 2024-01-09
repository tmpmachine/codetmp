let compoStateManager = (function() {
  
    let SELF = {
        pushState,
        popState,
        isState,
        getStates,
    };

    let states = [];

    function getState(stateNumber) {
        let state = '';
        switch (stateNumber) {
            case 0: state = 'modal-window'; break;
            case 1: state = 'file-manager'; break;
        }
        return state;
    }

    function pushState(_states) {
        for (let state of _states) {
            state = getState(state);
            let index = states.indexOf(state);
            if (index < 0)
                states.push(state);	
        }
    }

    function popState(_states) {
        for (let state of _states) {
            state = getState(state);
            let index = states.indexOf(state);
            if (index >= 0)
                states.splice(index,1);
        }
    }

    function hasState(_states, isOnlyState = false) {
        if (isOnlyState && (_states.length != states.length))
            return false;

        for (let state of _states) {
            state = getState(state);
            let index = states.indexOf(state);
            if (index < 0)
                return false;
        }
        return true;
    }

    function isState(stateId) {
        let result = false;
        switch (stateId) {
            case 0:
                result = hasState([1], true);
            break;
            case 1:
                result = hasState([0]);
            break;
        }
        return result;
    }

    function getStates() {
        return states;
    }

    return SELF;
    
})();