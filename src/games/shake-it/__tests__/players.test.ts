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
  submitPlayerResult,
  allPlayersSubmitted,
  getLeaderboard,
} from '../players'

beforeEach(() => {
  resetPlayers()
})

describe('addPlayer', () => {
  it('應正確新增玩家', () => {
    expect(addPlayer('p1', 'Alice')).toBe(true)
    expect(getPlayerCount()).toBe(1)
    const player = getPlayerById('p1')
    expect(player?.name).toBe('Alice')
    expect(player?.colorIndex).toBe(0)
    expect(player?.score).toBe(0)
    expect(player?.hasSubmitted).toBe(false)
  })

  it('應自動分配 colorIndex', () => {
    addPlayer('p1', 'Alice')
    addPlayer('p2', 'Bob')
    addPlayer('p3', 'Charlie')
    expect(getPlayerById('p1')?.colorIndex).toBe(0)
    expect(getPlayerById('p2')?.colorIndex).toBe(1)
    expect(getPlayerById('p3')?.colorIndex).toBe(2)
  })

  it('應使用預設名稱', () => {
    addPlayer('p1', '')
    expect(getPlayerById('p1')?.name).toBe('Player 1')
  })

  it('應拒絕重複 ID', () => {
    addPlayer('p1', 'Alice')
    expect(addPlayer('p1', 'Bob')).toBe(false)
    expect(getPlayerCount()).toBe(1)
  })

  it('應拒絕超過 8 人', () => {
    for (let i = 0; i < 8; i++) {
      expect(addPlayer(`p${i}`, `Player ${i}`)).toBe(true)
    }
    expect(addPlayer('p8', 'Player 8')).toBe(false)
    expect(getPlayerCount()).toBe(8)
  })

  it('鎖定時應拒絕新增', () => {
    lockPlayers()
    expect(addPlayer('p1', 'Alice')).toBe(false)
  })
})

describe('removePlayer', () => {
  it('應正確移除玩家', () => {
    addPlayer('p1', 'Alice')
    expect(removePlayer('p1')).toBe(true)
    expect(getPlayerCount()).toBe(0)
  })

  it('應拒絕移除不存在的玩家', () => {
    expect(removePlayer('nonexistent')).toBe(false)
  })

  it('鎖定時應拒絕移除', () => {
    addPlayer('p1', 'Alice')
    lockPlayers()
    expect(removePlayer('p1')).toBe(false)
  })
})

describe('lockPlayers / unlockPlayers', () => {
  it('鎖定後不能新增或移除', () => {
    addPlayer('p1', 'Alice')
    lockPlayers()
    expect(addPlayer('p2', 'Bob')).toBe(false)
    expect(removePlayer('p1')).toBe(false)
  })

  it('解鎖後可以操作', () => {
    lockPlayers()
    unlockPlayers()
    expect(addPlayer('p1', 'Alice')).toBe(true)
  })
})

describe('resetPlayersGameState', () => {
  it('應重置 score 和 hasSubmitted', () => {
    addPlayer('p1', 'Alice')
    submitPlayerResult('p1', 42)
    resetPlayersGameState()
    const player = getPlayerById('p1')
    expect(player?.score).toBe(0)
    expect(player?.hasSubmitted).toBe(false)
  })
})

describe('getPlayerPositions', () => {
  it('0 人回傳空陣列', () => {
    expect(getPlayerPositions(1000)).toEqual([])
  })

  it('1 人置中', () => {
    addPlayer('p1', 'Alice')
    expect(getPlayerPositions(1000)).toEqual([500])
  })

  it('2 人均勻分布', () => {
    addPlayer('p1', 'Alice')
    addPlayer('p2', 'Bob')
    const positions = getPlayerPositions(900)
    expect(positions).toHaveLength(2)
    expect(positions[0]).toBeCloseTo(300)
    expect(positions[1]).toBeCloseTo(600)
  })
})

describe('submitPlayerResult', () => {
  it('應正確提交結果', () => {
    addPlayer('p1', 'Alice')
    expect(submitPlayerResult('p1', 42)).toBe(true)
    const player = getPlayerById('p1')
    expect(player?.score).toBe(42)
    expect(player?.hasSubmitted).toBe(true)
  })

  it('應拒絕重複提交', () => {
    addPlayer('p1', 'Alice')
    submitPlayerResult('p1', 42)
    expect(submitPlayerResult('p1', 99)).toBe(false)
    expect(getPlayerById('p1')?.score).toBe(42)
  })

  it('應拒絕不存在的玩家', () => {
    expect(submitPlayerResult('nonexistent', 42)).toBe(false)
  })
})

describe('allPlayersSubmitted', () => {
  it('無玩家時回傳 false', () => {
    expect(allPlayersSubmitted()).toBe(false)
  })

  it('部分提交時回傳 false', () => {
    addPlayer('p1', 'Alice')
    addPlayer('p2', 'Bob')
    submitPlayerResult('p1', 42)
    expect(allPlayersSubmitted()).toBe(false)
  })

  it('全部提交時回傳 true', () => {
    addPlayer('p1', 'Alice')
    addPlayer('p2', 'Bob')
    submitPlayerResult('p1', 42)
    submitPlayerResult('p2', 38)
    expect(allPlayersSubmitted()).toBe(true)
  })
})

describe('getLeaderboard', () => {
  it('應按分數降序排列', () => {
    addPlayer('p1', 'Alice')
    addPlayer('p2', 'Bob')
    addPlayer('p3', 'Charlie')
    submitPlayerResult('p1', 10)
    submitPlayerResult('p2', 42)
    submitPlayerResult('p3', 25)

    const lb = getLeaderboard()
    expect(lb[0]?.id).toBe('p2')
    expect(lb[1]?.id).toBe('p3')
    expect(lb[2]?.id).toBe('p1')
  })

  it('應回傳複本（不影響原始資料）', () => {
    addPlayer('p1', 'Alice')
    const lb = getLeaderboard()
    expect(lb).not.toBe(getPlayers())
  })
})
