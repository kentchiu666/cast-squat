import { describe, it, expect, beforeEach } from 'vitest'
import {
  addPlayer,
  removePlayer,
  lockPlayers,
  unlockPlayers,
  getPlayers,
  getPlayerById,
  resetPlayers,
  resetPlayersGameState,
  getPlayerCount,
  getPlayerPositions,
  triggerPlayerJump,
  getLeaderboard,
} from '../players'
import { JUMP_PHASE } from '../constants'

beforeEach(() => {
  resetPlayers()
})

describe('addPlayer', () => {
  it('adds a player successfully', () => {
    expect(addPlayer('p1', 'Alice')).toBe(true)
    expect(getPlayerCount()).toBe(1)
  })

  it('assigns correct colorIndex based on join order', () => {
    addPlayer('p1', 'Alice')
    addPlayer('p2', 'Bob')
    const players = getPlayers()
    expect(players[0]!.colorIndex).toBe(0)
    expect(players[1]!.colorIndex).toBe(1)
  })

  it('uses default name when empty', () => {
    addPlayer('p1', '')
    expect(getPlayers()[0]!.name).toBe('Player 1')
  })

  it('rejects duplicate playerId', () => {
    addPlayer('p1', 'Alice')
    expect(addPlayer('p1', 'Bob')).toBe(false)
    expect(getPlayerCount()).toBe(1)
  })

  it('rejects when max players reached', () => {
    addPlayer('p1', 'A')
    addPlayer('p2', 'B')
    addPlayer('p3', 'C')
    addPlayer('p4', 'D')
    expect(addPlayer('p5', 'E')).toBe(false)
    expect(getPlayerCount()).toBe(4)
  })

  it('rejects when locked', () => {
    lockPlayers()
    expect(addPlayer('p1', 'Alice')).toBe(false)
    expect(getPlayerCount()).toBe(0)
  })

  it('initializes jumpState to IDLE', () => {
    addPlayer('p1', 'Alice')
    const player = getPlayerById('p1')!
    expect(player.jumpState.jumpPhase).toBe(JUMP_PHASE.IDLE)
    expect(player.jumpState.characterY).toBe(0)
    expect(player.squatCount).toBe(0)
    expect(player.coinScore).toBe(0)
  })
})

describe('removePlayer', () => {
  it('removes an existing player', () => {
    addPlayer('p1', 'Alice')
    expect(removePlayer('p1')).toBe(true)
    expect(getPlayerCount()).toBe(0)
  })

  it('returns false for non-existent player', () => {
    expect(removePlayer('p1')).toBe(false)
  })

  it('rejects when locked', () => {
    addPlayer('p1', 'Alice')
    lockPlayers()
    expect(removePlayer('p1')).toBe(false)
    expect(getPlayerCount()).toBe(1)
  })
})

describe('lockPlayers / unlockPlayers', () => {
  it('prevents add/remove when locked', () => {
    lockPlayers()
    expect(addPlayer('p1', 'A')).toBe(false)
  })

  it('allows add/remove after unlock', () => {
    lockPlayers()
    unlockPlayers()
    expect(addPlayer('p1', 'A')).toBe(true)
  })
})

describe('getPlayerById', () => {
  it('returns player by id', () => {
    addPlayer('p1', 'Alice')
    expect(getPlayerById('p1')!.name).toBe('Alice')
  })

  it('returns undefined for unknown id', () => {
    expect(getPlayerById('unknown')).toBeUndefined()
  })
})

describe('resetPlayersGameState', () => {
  it('resets scores and jumpState but keeps players', () => {
    addPlayer('p1', 'Alice')
    const player = getPlayerById('p1')!
    player.squatCount = 10
    player.coinScore = 30

    resetPlayersGameState()

    const resetPlayer = getPlayerById('p1')!
    expect(resetPlayer.squatCount).toBe(0)
    expect(resetPlayer.coinScore).toBe(0)
    expect(resetPlayer.jumpState.jumpPhase).toBe(JUMP_PHASE.IDLE)
    expect(resetPlayer.name).toBe('Alice') // name preserved
  })
})

describe('getPlayerPositions', () => {
  it('returns empty array for no players', () => {
    expect(getPlayerPositions(800)).toEqual([])
  })

  it('evenly distributes 1 player at center', () => {
    addPlayer('p1', 'A')
    const positions = getPlayerPositions(800)
    expect(positions).toEqual([400])
  })

  it('evenly distributes 2 players', () => {
    addPlayer('p1', 'A')
    addPlayer('p2', 'B')
    const positions = getPlayerPositions(900)
    // spacing = 900 / 3 = 300
    expect(positions).toEqual([300, 600])
  })

  it('evenly distributes 4 players', () => {
    addPlayer('p1', 'A')
    addPlayer('p2', 'B')
    addPlayer('p3', 'C')
    addPlayer('p4', 'D')
    const positions = getPlayerPositions(1000)
    // spacing = 1000 / 5 = 200
    expect(positions).toEqual([200, 400, 600, 800])
  })
})

describe('triggerPlayerJump', () => {
  it('triggers jump for idle player', () => {
    addPlayer('p1', 'Alice')
    expect(triggerPlayerJump('p1')).toBe(true)
    const player = getPlayerById('p1')!
    expect(player.jumpState.jumpPhase).toBe(JUMP_PHASE.ANTICIPATION)
    expect(player.squatCount).toBe(1)
  })

  it('rejects jump for non-idle player', () => {
    addPlayer('p1', 'Alice')
    triggerPlayerJump('p1') // now in ANTICIPATION
    expect(triggerPlayerJump('p1')).toBe(false)
  })

  it('returns false for unknown player', () => {
    expect(triggerPlayerJump('unknown')).toBe(false)
  })

  it('increments squatCount on each jump', () => {
    addPlayer('p1', 'Alice')
    triggerPlayerJump('p1')

    // Reset to IDLE to allow another jump
    const player = getPlayerById('p1')!
    player.jumpState.jumpPhase = JUMP_PHASE.IDLE
    triggerPlayerJump('p1')
    expect(player.squatCount).toBe(2)
  })
})

describe('getLeaderboard', () => {
  it('returns empty array for no players', () => {
    expect(getLeaderboard()).toEqual([])
  })

  it('sorts by total score (squatCount + coinScore) descending', () => {
    addPlayer('p1', 'Alice')
    addPlayer('p2', 'Bob')
    addPlayer('p3', 'Charlie')

    const alice = getPlayerById('p1')!
    const bob = getPlayerById('p2')!
    const charlie = getPlayerById('p3')!

    alice.squatCount = 5
    alice.coinScore = 10 // total = 15

    bob.squatCount = 10
    bob.coinScore = 20 // total = 30

    charlie.squatCount = 8
    charlie.coinScore = 12 // total = 20

    const leaderboard = getLeaderboard()
    expect(leaderboard[0]!.name).toBe('Bob')
    expect(leaderboard[1]!.name).toBe('Charlie')
    expect(leaderboard[2]!.name).toBe('Alice')
  })

  it('does not mutate original players array', () => {
    addPlayer('p1', 'Alice')
    addPlayer('p2', 'Bob')
    const original = getPlayers()
    getLeaderboard()
    expect(getPlayers()).toBe(original) // same reference
  })
})
