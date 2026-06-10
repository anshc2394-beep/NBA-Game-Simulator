import os
from flask import Flask, render_template, request, flash
from nba_service import NBAService, SimulationModel, simulate_game

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'basketball-simulation-secret')
service = NBAService()
model = SimulationModel()

@app.route('/', methods=['GET', 'POST'])
def index():
    source = request.form if request.method == 'POST' else request.args
    search = source.get('search', '').strip()
    team_filter = source.get('team_filter', '').strip()
    position_filter = source.get('position_filter', '').strip()
    era_filter = source.get('era_filter', '').strip()
    selected_a = request.args.getlist('selected_a') if request.method == 'GET' else request.form.getlist('team_a')
    selected_b = request.args.getlist('selected_b') if request.method == 'GET' else request.form.getlist('team_b')

    players = service.get_filtered_players(
        search=search,
        team_filter=team_filter,
        position_filter=position_filter,
        era_filter=era_filter,
        limit=120,
    )

    result = None

    if request.method == 'POST':
        team_a_ids = selected_a
        team_b_ids = selected_b

        try:
            if len(team_a_ids) != 5 or len(team_b_ids) != 5:
                raise ValueError('Each team must have exactly 5 players.')
            if set(team_a_ids) & set(team_b_ids):
                raise ValueError('A player cannot be selected for both teams.')

            team_a = [service.get_player_profile(int(player_id)) for player_id in team_a_ids]
            team_b = [service.get_player_profile(int(player_id)) for player_id in team_b_ids]

            if len(team_a) != 5 or len(team_b) != 5:
                raise ValueError('One or more selected players could not be loaded.')

            result = simulate_game(team_a, team_b, model)
        except Exception as exc:
            flash(str(exc), 'error')

    filter_values = {
        'search': search,
        'team_filter': team_filter,
        'position_filter': position_filter,
        'era_filter': era_filter,
    }

    return render_template(
        'index.html',
        players=players,
        result=result,
        selected_a=selected_a,
        selected_b=selected_b,
        filter_values=filter_values,
        team_options=service.get_team_options(),
        position_options=service.get_position_options(),
        era_options=service.get_era_options(),
    )

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
