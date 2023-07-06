import JobManager from '../../library/jobs/job-manager.mjs'
import crypto from 'crypto'

describe('JobManager', () => {
  describe('createJobUUID', () => {
    it('should create a unique hash from applicationName, appName, controllerName, and name', () => {
      const applicationName = 'TestApplication'
      const appName = 'TestApp'
      const controllerName = 'TestController'
      const name = 'TestJob'

      const expectedHash = crypto.createHash('md5')
        .update(`${applicationName}${appName}${controllerName}${name}`)
        .digest('hex')

      const result = JobManager.createJobUUID(applicationName, appName, controllerName, name)

      expect(result).toEqual(expectedHash)
    })
  })
})
