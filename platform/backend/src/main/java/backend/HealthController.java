
package backend;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

@RestController
@CrossOrigin(origins = "*")
public class HealthController {

    private final RestTemplate restTemplate = new RestTemplate();

    // Checks whether the Spring Boot backend is running
    @GetMapping("/health")
    public String health() {
        return "Backend is running";
    }

    // Checks the health of the Docker test application
    @GetMapping("/api/application-status")
    public String applicationStatus() {
        try {
            String response = restTemplate.getForObject(
                "http://localhost:8081/health",
                String.class
            );

            if ("Application is healthy".equals(response)) {
                return "Healthy";
            }

            return "Unhealthy";

        } catch (Exception e) {
            return "Unreachable";
        }
    }
}
