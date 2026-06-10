import { Team } from '../team';
import { Prediction, StatsModel, ModelWeights } from './statsModel';

export class GameTrainer {
    private model: StatsModel;

    constructor(model?: StatsModel) {
        this.model = model ?? new StatsModel();
    }

    predict(teamA: Team, teamB: Team): Prediction {
        return this.model.predict(teamA, teamB);
    }

    train(teamA: Team, teamB: Team, winner: string): void {
        this.model.train(teamA, teamB, winner);
    }

    getModelState(): ModelWeights {
        return this.model.getWeights();
    }
}
