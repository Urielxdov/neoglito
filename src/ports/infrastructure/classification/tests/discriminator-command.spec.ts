import { ServiceType as T } from '../../../../deployment/domain/value-objects/service-type.js'
import type { ContainerContext } from '../classification.js'
import { commandDiscriminator } from '../discriminator-command.js'

const run = (...command: string[]) => {
  const ctx: ContainerContext = {
    id: 'c',
    image: 'x',
    host: 'h',
    aliases: [],
    ports: [],
    command,
    env: {},
  }
  return commandDiscriminator.discriminate(ctx, [], {})
}

describe('commandDiscriminator', () => {
  it.each([
    [['celery', '-A', 'billing', 'beat'], [T.SCHEDULER]],
    [['sh', '-c', 'celery -A billing worker'], [T.WORKER]],
    [['celery', '-A', 'billing', 'worker', '-B'], [T.WORKER, T.SCHEDULER]],
    [['celery', '-A', 'billing', 'worker', '-EB'], [T.WORKER, T.SCHEDULER]],
    [['celery', '-A', 'billing', 'worker', '--beat'], [T.WORKER, T.SCHEDULER]],
    [['ofelia', 'daemon'], [T.SCHEDULER]],
    [['supercronic', '/etc/crontab'], [T.SCHEDULER]],
    [['cron', '-f'], [T.SCHEDULER]],
    [['/usr/sbin/crond', '-n'], [T.SCHEDULER]],
    [['sh', '-c', 'cron && tail -f /var/log/cron.log'], [T.SCHEDULER]],
    [['rqscheduler'], [T.SCHEDULER]],
    [['airflow', 'scheduler'], [T.SCHEDULER]],
    [['rqworker', 'default'], [T.WORKER]],
    [['rq', 'worker'], [T.WORKER]],
    [['dramatiq', 'app'], [T.WORKER]],
    [['arq', 'app.WorkerSettings'], [T.WORKER]],
    [['huey_consumer', 'app.huey'], [T.WORKER]],
    [['python', 'manage.py', 'qcluster'], [T.WORKER]],
    [['bundle', 'exec', 'sidekiq'], [T.WORKER]],
  ])('%j → %j', async (command, types) => {
    expect((await run(...command))?.types).toEqual(types)
  })

  it.each([
    [['gunicorn', 'app.wsgi']],
    [['crontab', '-l']],
    [['celery', '-A', 'billing', 'inspect', 'ping']],
    [[]],
  ])('%j → null', async (command) => {
    expect(await run(...command)).toBeNull()
  })

  it('`beat_app` y `-Ofair` no se confunden con beat', async () => {
    const finding = await run('celery', '-A', 'beat_app', 'worker', '-l', 'info', '-Ofair')

    expect(finding?.types).toEqual([T.WORKER])
  })
})
